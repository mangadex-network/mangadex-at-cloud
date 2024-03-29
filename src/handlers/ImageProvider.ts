import { URL } from 'url';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import * as stream from 'stream';
import { ParameterizedContext } from 'koa';
import fetch, { Request } from 'node-fetch-lite';
import { IUpstreamProvider } from '../RemoteController';

export function CreateCacheProvider(upstreamProvider: IUpstreamProvider, cache: string, size: number): ImageProvider {
    if(/^https?:/.test(cache)) {
        return new CloudCacheImageProvider(upstreamProvider, cache);
    }
    try {
        fs.ensureDirSync(cache || null);
        return new FileCacheImageProvider(upstreamProvider, cache, size);
    } catch(error) {}

    console.warn(`The parameter '${cache}' is not valid for any of the supported cache providers, images will not be cached!`);
    return new ImageProvider(upstreamProvider);
}

class ImageProvider {

    protected readonly _upstreamProvider: IUpstreamProvider;

    constructor(upstreamProvider: IUpstreamProvider) {
        this._upstreamProvider = upstreamProvider;
    }

    protected async _tryStreamResponseFromCache(_upstreamURI: URL, _ctx: ParameterizedContext): Promise<boolean> {
        return false;
    }

    protected async _tryStreamResponseToCache(_upstreamURI: URL, _ctx: ParameterizedContext): Promise<boolean> {
        return false;
    }

    protected async _tryStreamResponseFromURI(target: URL, ctx: ParameterizedContext): Promise<boolean> {
        try {
            console.debug('ImageProvider._tryStreamResponseFromURI()', '=>', target.href);
            const request = new Request(target.href, {
                headers: {
                    'X-Forwarded-For': ctx.ip,
                    'Forwarded': 'for=' + ctx.ip
                }
            });
            const response = await fetch(request);
            if(response.ok && response.status === 200) {
                const cache = response.headers.get('x-cache') || response.headers.get('cf-cache-status') || 'MISS';
                ctx.set('X-Cache', cache);
                ctx.set('X-Cache-Lookup', response.headers.get('x-cache-lookup') || cache);
                ctx.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
                const contentLength = response.headers.get('Content-Length');
                if(contentLength) {
                    ctx.set('Content-Length', contentLength);
                } else {
                    ctx.set('Transfer-Encoding', 'chunked');
                }
                const lastModified = response.headers.get('Last-Modified');
                if(lastModified) {
                    ctx.set('Last-Modified', lastModified);
                }
                ctx.body = response.body;
                ctx.status = response.status;
                return true;
            }
        } catch(error) {
            return false;
        }
    }

    private async _handler(ctx: ParameterizedContext, _next: () => Promise<void>) {
        ctx.set('Access-Control-Allow-Origin', '*');
        ctx.set('Access-Control-Expose-Headers', '*');
        ctx.set('Cache-Control', 'public/ max-age=1209600');
        ctx.set('Timing-Allow-Origin', '*');
        ctx.set('X-Content-Type-Options', 'nosniff');
        const upstreamURI = this._upstreamProvider.getImageURL(ctx.URL.pathname);
        if(await this._tryStreamResponseFromCache(upstreamURI, ctx)) {
            return;
        }
        if(await this._tryStreamResponseFromURI(upstreamURI, ctx)) {
            await this._tryStreamResponseToCache(upstreamURI, ctx);
            return;
        }
        // '502 Bad Gateway - The server was acting as a gateway or proxy and received an invalid response from the upstream server';
        console.debug('ImageProvider.handler()', '=>', '502 - Bad Gateway');
        ctx.body = 'Bad Gateway';
        ctx.status = 502;
    }

    public get handler() {
        return this._handler.bind(this);
    }
}

class CloudCacheImageProvider extends ImageProvider {

    private _originCDN: string;

    constructor(upstreamProvider: IUpstreamProvider, originCDN: string) {
        super(upstreamProvider);
        this._originCDN = originCDN;
    }

    protected async _tryStreamResponseFromCache(upstreamURI: URL, ctx: ParameterizedContext): Promise<boolean> {
        try {
            const uri = new URL(upstreamURI.pathname, this._originCDN);
            console.debug('CloudCacheImageProvider._tryStreamResponseFromCache()', '=>', uri.href);
            return this._tryStreamResponseFromURI(uri, ctx);
        } catch(error) {
            return false;
        }
    }
}

interface IShard {
    ts: string;
    entries: number;
    size: number;
}

const diskSafetySize: number = 4294967296;
const cacheSafetySize: number = 2147483648;
const cacheShardUpdateDelay: number = 1000; // [ms]
const cacheShardIndexFileName: string = 'shards.json';
const cacheShardStoreInterval: number = 60000; // [ms]
const cacheShardNameLength: number = 2; // 16^2 shards
const cacheFileNameLength: number = 24; // 16^24 possible files

// Maybe place shard watching stuff into separate wroker thread?
export class FileCacheImageProvider extends ImageProvider {

    private _shardIndex: Map<string, IShard> = new Map();
    private _freeDiskSpace: number = Number.MAX_SAFE_INTEGER;
    private readonly _shardIndexFile: string;
    private readonly _cacheDirectory: string;
    private readonly _cacheLimit: number;
    private readonly _leaseTime: number;

    constructor(upstreamProvider: IUpstreamProvider, cacheDirectory: string, cacheLimit: number, leaseTime: number = 2635200) {
        super(upstreamProvider);
        this._shardIndexFile = path.join(cacheDirectory, cacheShardIndexFileName);
        this._cacheDirectory = cacheDirectory;
        this._cacheLimit = cacheLimit;
        this._leaseTime = leaseTime;
        this._startWatchingShardsOnce();
    }

    private * _getShardKeys(repeat: boolean = false): Generator<string, void, unknown> {
        const shardCount = Math.pow(16, cacheShardNameLength);
        for(let i = 0; i < shardCount; i++, repeat ? i %= shardCount : null) {
            yield i.toString(16).padStart(cacheShardNameLength, '0');
        }
    }

    private async _initializeShardIndex(): Promise<void> {
        try {
            this._shardIndex = new Map(await fs.readJson(this._shardIndexFile));
        } catch(error) {
            console.warn(`Failed to load shard index from file '${this._shardIndexFile}':`, error);
        }
        for(let shard of this._getShardKeys()) {
            fs.ensureDir(path.join(this._cacheDirectory, shard));
            if(!this._shardIndex.has(shard)) {
                this._shardIndex.set(shard, {
                    ts: new Date().toISOString(),
                    entries: -1,
                    size: 0
                });
            }
        }
        console.info('Loaded shard index:', this._shardIndex.size, '@', this._cacheSize, '=>', this._shardIndexFile);
    }

    private async _storeShardIndex() {
        try {
            await fs.writeJson(this._shardIndexFile, [...this._shardIndex], { spaces: 2 });
            console.info('Saved shard index:', this._shardIndex.size, '@', this._cacheSize, '=>', this._shardIndexFile);
        } catch(error) {
            console.warn(`Failed to save shard index to file '${this._shardIndexFile}':`, error);
        }
    }

    private async _startWatchingShardsOnce() {
        this._startWatchingShardsOnce = async () => console.warn(`The method 'FileCacheImageProvider._startWatchingShards()' can only be called once!`);
        // TODO: start watching free disk space and update this._freeDiskSpace
        setInterval(this._storeShardIndex.bind(this), cacheShardStoreInterval).unref();
        await this._initializeShardIndex();
        for (let shard of this._getShardKeys(true)) {
            await this._updateShard(shard);
            if(this._shardIndex.get(shard).entries > 0) {
                // TODO: wait depending on file number of shard?
                await new Promise(resolve => setTimeout(resolve, cacheShardUpdateDelay));
            }
        }
    }

    private async _updateShard(shard: string): Promise<void> {
        try {
            let bytes = 0;
            const directory = path.join(this._cacheDirectory, shard);
            const entries = await fs.readdir(directory);
            for(let entry of entries) {
                bytes += (await fs.stat(path.join(directory, entry))).size;
            }
            this._shardIndex.set(shard, {
                ts: new Date().toISOString(),
                entries: entries.length,
                size: bytes
            });
        } catch(error) {
            console.warn(`Failed to update shard info for '${shard}':`, error);
        }
    }

    private get _cacheSize() {
        const allShards = [...this._shardIndex.values()];
        const validShards = allShards.filter(shard => shard.entries > -1);
        return validShards.reduce((accumulator, shard) => accumulator + shard.size, 0) * allShards.length / (validShards.length || 1);
    }

    private get _cacheSizeSafe(): number {
        return this._cacheSize + cacheSafetySize;
    }

    private _getIdentifier(upstreamURI: URL) {
        let hash = crypto.createHash('sha1').update(upstreamURI.pathname).digest('hex');
        const shard = hash.slice(0, cacheShardNameLength);
        const file = hash.slice(-cacheFileNameLength);
        return {
            shard: shard,
            path: path.join(this._cacheDirectory, shard, file)
        };
    }

    private _getMime(bytes: Buffer) {
        const match = (value: number, index: number) => value === bytes[index];
        if([ 0xFF, 0xD8, 0xFF       ].every(match)) { return 'image/jpeg'; }
        if([ 0x52, 0x49, 0x46, 0x46 ].every(match)) { return 'image/webp'; }
        if([ 0x89, 0x50, 0x4E, 0x47 ].every(match)) { return 'image/png'; }
        if([ 0x47, 0x49, 0x46, 0x38 ].every(match)) { return 'image/gif'; }
        if([ 0x42, 0x4D             ].every(match)) { return 'image/bmp'; }
        return 'application/octet-stream';
    }

    protected async _tryStreamResponseFromCache(upstreamURI: URL, ctx: ParameterizedContext): Promise<boolean> {
        try {
            const identifier = this._getIdentifier(upstreamURI);
            console.debug('FileCacheImageProvider._tryStreamResponseFromCache()', '=>', identifier.path);
            const fd = await fs.open(identifier.path, 'r');
            // TODO: update access time of file
            //const stat = await fs.fstat(fd);
            //ctx.set('Content-Length', stat.size.toString());
            //ctx.set('Last-Modified', stat.mtime.toUTCString());
            const signature = await fs.read(fd, Buffer.alloc(4), 0, 4, 0);
            const sr = fs.createReadStream(null, { fd: fd, start: 0, highWaterMark: 262144 });
            ctx.set('X-Cache', 'HIT');
            ctx.set('X-Cache-Lookup', 'HIT');
            ctx.set('Transfer-Encoding', 'chunked');
            ctx.set('Content-Type', this._getMime(signature.buffer));
            ctx.status = 200;
            ctx.body = sr;
            /********************************************************************
            *** Non-piped solution, with competitive speed to piped solution ****
            *********************************************************************
            const buffer = await fs.readFile(cacheFile);
            ctx.set('X-Cache', 'HIT');
            ctx.set('X-Cache-Lookup', 'HIT');
            ctx.set('Content-Type', this._getMime(buffer));
            ctx.set('Content-Length', buffer.length.toString());
            ctx.status = 200;
            ctx.body = buffer;
            ********************************************************************/
            return true;
        } catch(error) {
            return false;
        }
    }

    protected async _tryStreamResponseToCache(upstreamURI: URL, ctx: ParameterizedContext): Promise<boolean> {
        try {
            if(this._freeDiskSpace < diskSafetySize) {
                throw new Error(`The available disk space of ${this._freeDiskSpace} bytes is running low!`);
            }
            if(this._cacheSizeSafe > this._cacheLimit) {
                throw new Error(`Estimated cache size of ${this._cacheSizeSafe} bytes exceeds the cache size limit of ${this._cacheLimit} bytes!`);
            }
            if(ctx.status !== 200) {
                throw new Error('Failed to cache response with status ' + ctx.status);
            }
            const identifier = this._getIdentifier(upstreamURI);
            console.debug('FileCacheImageProvider._tryStreamResponseToCache()', '<=', identifier.path);
            // NOTE: Force pause() on body stream to prevent pipe() from instantly starting consumption
            //       Reason: Wait for Koa to pipe body to the res stream as well: ctx.body.pipe(ctx.res)
            //       => https://github.com/koajs/koa/blob/master/lib/application.js#L267
            (ctx.body as stream.Readable).pause();
            (ctx.body as stream.Readable).pipe(fs.createWriteStream(identifier.path, { highWaterMark: 262144 }));
            // immediately update shard size to bridge the gap until the next shard size update is performed
            const shard = this._shardIndex.get(identifier.shard);
            this._shardIndex.set(identifier.shard, {
                ts: new Date().toISOString(),
                entries: shard.entries > -1 ? shard.entries + 1 : 1,
                size: shard.size + (ctx.length || 1048576) // reserve at least 1 MB fallback size for added image
            });
            return true;
        } catch(error) {
            console.warn(`Failed to cache '${upstreamURI.pathname}'!`, error);
            return false;
        }
    }
}