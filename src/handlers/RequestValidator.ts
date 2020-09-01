import { URL } from 'url';
import { ParameterizedContext, Request } from 'koa';

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

    private _verify(ctx: ParameterizedContext): boolean {
        return this._verifyHost(ctx.URL.hostname)
            && this._verifyReferer(ctx.headers.get('referer'))
            && this._verifyPattern(ctx.URL.pathname)
            && this._verifyToken(ctx.URL.pathname);
    }

    private async _handler(ctx: ParameterizedContext, next: () => Promise<void>) {
        if(this._verify(ctx)) {
            console.info(`[REQUEST From: ${ctx.ip}]`, '<=', ctx.URL.href);
            await next();
        } else {
            console.info(`[BLOCKED From: ${ctx.ip}]`, '<=', ctx.URL.href, '@', ctx.headers.get('referer'));
            ctx.status = 403;
            ctx.body = 'Forbidden';
        }
    }

    public get handler() {
        return this._handler.bind(this);
    }
}