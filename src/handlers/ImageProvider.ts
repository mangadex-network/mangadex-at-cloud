import { URL } from 'url';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import { ParameterizedContext } from 'koa';
import fetch, { Request } from 'node-fetch-lite';
import { IRemoteController } from '../RemoteController';

export function CreateCacheProvider(remoteController: IRemoteController, cache: string, size: number): ImageProvider {
    if(/^https?:/.test(cache)) {
        return new CloudCacheImageProvider(remoteController, cache);
    }
    try {
        fs.ensureDirSync(cache || null);
        return new FileCacheImageProvider(remoteController, cache, size);
    } catch(error) {}

    console.warn(`The parameter '${cache}' is not valid for any of the supported cache providers, images will not be cached!`);
    return new ImageProvider(remoteController);
}

class ImageProvider {

    protected readonly _remoteController: IRemoteController;

    constructor(remoteController: IRemoteController) {
        this._remoteController = remoteController;
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
        ctx.set('Server', this._remoteController.identifier);
        ctx.set('Access-Control-Allow-Origin', 'https://mangadex.org');
        ctx.set('Access-Control-Expose-Headers', '*');
        ctx.set('Cache-Control', 'public/ max-age=1209600');
        ctx.set('Timing-Allow-Origin', 'https://mangadex.org');
        ctx.set('X-Content-Type-Options', 'nosniff');
        const upstreamURI = this._remoteController.getImageURL(ctx.URL.pathname);
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

    constructor(remoteController: IRemoteController, originCDN: string) {
        super(remoteController);
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

const cacheShardNameLength: number = 2; // 16^2 shards
const cacheFileNameLength: number = 24; // 16^24 possible files
export class FileCacheImageProvider extends ImageProvider {

    private readonly _cacheDirectory: string;
    private readonly _cacheSize: number;
    private readonly _leaseTime: number;

    constructor(remoteController: IRemoteController, cacheDirectory: string, cacheSize: number, leaseTime: number = 2635200) {
        super(remoteController);
        this._cacheDirectory = cacheDirectory;
        this._cacheSize = cacheSize;
        this._leaseTime = leaseTime;
        this._initializeCacheDirectory();
    }

    private _initializeCacheDirectory() {
        for(let i = 0; i < Math.pow(16, cacheShardNameLength); i++) {
            const shard = path.join(this._cacheDirectory, i.toString(16).padStart(cacheShardNameLength, '0'));
            fs.ensureDir(shard);
        }
    }

    private _getCacheFile(upstreamURI: URL): string {
        let hash = crypto.createHash('sha1').update(upstreamURI.pathname).digest('hex');
        return path.join(this._cacheDirectory, hash.slice(0, cacheShardNameLength), hash.slice(-cacheFileNameLength));
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
            const cacheFile = this._getCacheFile(upstreamURI);
            console.debug('FileCacheImageProvider._tryStreamResponseFromCache()', '=>', cacheFile);
            const fd = await fs.open(cacheFile, 'r');
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
            const cacheFile = this._getCacheFile(upstreamURI);
            console.debug('FileCacheImageProvider._tryStreamResponseToCache()', '<=', cacheFile);
            if(ctx.status !== 200) {
                throw new Error('Failed to cache response with status ' + ctx.status);
            }
            // NOTE: Force pause() on body stream to prevent pipe() from instantly starting consumption
            //       Reason: Wait for Koa to pipe body to the res stream as well: ctx.body.pipe(ctx.res)
            //       => https://github.com/koajs/koa/blob/master/lib/application.js#L267
            ctx.body.pause();
            ctx.body.pipe(fs.createWriteStream(cacheFile, { highWaterMark: 262144 }));
            return true;
        } catch(error) {
            console.warn('FileCacheImageProvider._tryStreamResponseToCache()', error);
            return false;
        }
    }
}