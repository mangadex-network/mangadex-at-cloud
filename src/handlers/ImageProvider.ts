import { URL } from 'url';
import { ParameterizedContext } from 'koa';
import fetch, { Request } from 'node-fetch-lite';
import { IRemoteController } from '../RemoteController';

export default function CreateImageProvider(remoteController: IRemoteController, cache: string, size: number): ImageProvider {
    if(/^https?:/.test(cache)) {
        return new CloudCacheImageProvider(remoteController, cache);
    }
    console.warn(`No cache provider found for '${cache}', images will not be cached!`);
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
            console.debug('ImageProviderCloudCache._tryStreamResponseFromCache()', '=>', uri.href);
            return this._tryStreamResponseFromURI(uri, ctx);
        } catch(error) {
            return false;
        }
    }
}