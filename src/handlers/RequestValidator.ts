import { Context, ContextRequest } from '../deps.ts';

export class RequestValidator {

    // => https://regex101.com/r/Ud3WDm/3
    private static readonly _pathTestPattern = /^(?:\/[_\-=%a-zA-Z0-9]+)?\/data(?:-saver)?\/[a-fA-F0-9]+\/[^/?#\s]+$/;

    private _verifyHost(hostname: string): boolean {
        return hostname.endsWith('.mangadex.network');
    }

    private _verifyReferer(referer: string | null): boolean {
        return !referer || new URL(referer).hostname.endsWith('mangadex.org');
    }

    private _verifyPattern(pathname: string): boolean {
        return RequestValidator._pathTestPattern.test(pathname);
    }

    private _verifyToken(pathname: string): boolean {
        const token = decodeURI(pathname.split('/').slice(-4).shift() || '');
        return token.length === 0 || token.length > 128;
    }

    private _verify(request: ContextRequest): boolean {
        return this._verifyHost(request.url.hostname)
            && this._verifyReferer(request.headers.get('referer'))
            && this._verifyPattern(request.url.pathname)
            && this._verifyToken(request.url.pathname);
    }

    private async _handler(ctx: Context<Record<string, any>>, next: () => Promise<void>) {
        if(this._verify(ctx.request)) {
            console.info(`[REQUEST From: ${ctx.request.ip}]`, '<=', ctx.request.url.href);
            await next();
        } else {
            console.debug(`[BLOCKED From: ${ctx.request.ip}]`, '<=', ctx.request.url.href, '|', ctx.request.headers.get('referer'));
            ctx.response.status = 403;
            ctx.response.body = 'Forbidden';
        }
    }

    public get handler() {
        return this._handler.bind(this);
    }
}