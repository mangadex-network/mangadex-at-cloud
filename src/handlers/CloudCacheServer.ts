import { Context } from '../deps.ts';
import { IRemoteController } from '../RemoteController.ts';

export class CloudCacheServer {

    private readonly _rpc: IRemoteController;
    private readonly _cdn: string;

    constructor(rpc: IRemoteController, cdn: string) {
        this._rpc = rpc;
        this._cdn = cdn;
    }

    private async report(uri: URL) {
        const content = {
            url: uri.href,
            success: true,
            bytes: Math.trunc(Math.random() * 1024 * 1024 + 100000)
        };
        let response  = await fetch('https://api.mangadex.network/report', {
            method: 'POST',
            body: JSON.stringify(content),
            headers: {
                'Referer': 'https://mangadex.org/chapter',
                'Content-Type': 'application/json'
            }
        });
        console.log('REPORT:', content, response.ok, response.status, await response.json());
    }

    private async _proxy(ctx: Context<Record<string, any>>, uri: URL): Promise<void> {
        const request = new Request(uri.href, {
            headers: {
                'X-Forwarded-For': ctx.request.ip,
                'Forwarded': 'for=' + ctx.request.ip
            }
        });
        const response = await fetch(request);
        if(response.ok && response.status === 200) {
            ctx.response.headers.set('X-Cache-Lookup', response.headers.get('cf-cache-status') || 'MISS');
            ctx.response.headers.set('X-Cache', response.headers.get('cf-cache-status') || 'MISS');
            ctx.response.headers.set('Content-Length', response.headers.get('Content-Length') || ''); // OR: ctx.response.headers.set('Transfer-Encoding', 'chunked');
            ctx.response.headers.set('Content-Type', response.headers.get('Content-Type') || '');
            //ctx.response.headers.set('Last-Modified', response.headers.get('Last-Modified'));
            ctx.response.body = new Uint8Array(await response.arrayBuffer());
            //response.body?.pipeThrough();
            //response.body?.pipeTo();
            ctx.response.status = response.status;
        } else {
            // TODO: consume data to free memory?
            //response.arrayBuffer();
            response.body?.cancel();
            throw new Error();
        }
    }

    private async _handler(ctx: Context<Record<string, any>>, _: () => Promise<void>) {
        this.report(ctx.request.url);
        // TODO: get from RemoteControllerService.clientAgent
        ctx.response.headers.set('Server', this._rpc.identifier);
        ctx.response.headers.set('Access-Control-Allow-Origin', 'https://mangadex.org');
        ctx.response.headers.set('Access-Control-Expose-Headers', '*');
        ctx.response.headers.set('Cache-Control', 'public/ max-age=1209600');
        ctx.response.headers.set('Timing-Allow-Origin', 'https://mangadex.org');
        ctx.response.headers.set('X-Content-Type-Options', 'nosniff');
        for(let origin of [ this._cdn, undefined ]) {
            try {
                const uri = this._rpc.getImageURL(ctx.request.url.pathname, origin);
                //console.log('CloudCacheServer.handler()', '=>', uri.href);
                await this._proxy(ctx, uri);
                return;
            } catch(error) {}
        }
        ctx.response.status = 502;
        ctx.response.body = '502 Bad Gateway - The server was acting as a gateway or proxy and received an invalid response from the upstream server';
    }

    public get handler() {
        return this._handler.bind(this);
    }
}