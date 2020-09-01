import { URL } from 'url';
import { ParameterizedContext } from 'koa';
import fetch, { Request } from 'node-fetch';
import { IRemoteController } from '../RemoteController';

export class CloudCacheServer {

    private readonly _remoteController: IRemoteController;
    private readonly _cloudCDN: string;

    constructor(remoteController: IRemoteController, cloudCDN: string) {
        this._remoteController = remoteController;
        this._cloudCDN = cloudCDN;
    }

    private async _proxy(ctx: ParameterizedContext, uri: URL): Promise<void> {
        const request = new Request(uri.href, {
            headers: {
                'X-Forwarded-For': ctx.ip,
                'Forwarded': 'for=' + ctx.ip
            }
        });
        const response = await fetch(request);
        if(response.ok && response.status === 200) {
            ctx.headers.set('X-Cache-Lookup', response.headers.get('cf-cache-status') || 'MISS');
            ctx.headers.set('X-Cache', response.headers.get('cf-cache-status') || 'MISS');
            ctx.headers.set('Content-Length', response.headers.get('Content-Length') || ''); // OR: ctx.headers.set('Transfer-Encoding', 'chunked');
            ctx.headers.set('Content-Type', response.headers.get('Content-Type') || '');
            //ctx.headers.set('Last-Modified', response.headers.get('Last-Modified'));
            ctx.body = new Uint8Array(await response.arrayBuffer());
            //response.body?.pipeThrough();
            //response.body?.pipeTo();
            ctx.status = response.status;
        } else {
            // TODO: consume data to free memory?
            response.arrayBuffer();
            //response.body.cancel();
            throw new Error();
        }
    }

    private async _handler(ctx: ParameterizedContext, _: () => Promise<void>) {
        ctx.headers.set('Server', this._remoteController.identifier);
        ctx.headers.set('Access-Control-Allow-Origin', 'https://mangadex.org');
        ctx.headers.set('Access-Control-Expose-Headers', '*');
        ctx.headers.set('Cache-Control', 'public/ max-age=1209600');
        ctx.headers.set('Timing-Allow-Origin', 'https://mangadex.org');
        ctx.headers.set('X-Content-Type-Options', 'nosniff');
        for(let origin of [ this._cloudCDN, undefined ]) {
            try {
                const uri = this._remoteController.getImageURL(ctx.URL.pathname, origin);
                console.debug('CloudCacheServer.handler()', '=>', uri.href);
                await this._proxy(ctx, uri);
                return;
            } catch(error) {}
        }
        // '502 Bad Gateway - The server was acting as a gateway or proxy and received an invalid response from the upstream server';
        console.debug('CloudCacheServer.handler()', '=>', '502 - Bad Gateway');
        ctx.body = 'Bad Gateway';
        ctx.status = 502;
    }

    public get handler() {
        return this._handler.bind(this);
    }
}