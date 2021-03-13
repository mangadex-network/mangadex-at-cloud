import { URL } from 'url';
import { ParameterizedContext } from 'koa';
import { ITokenValidator } from '../RemoteController';

// => https://regex101.com/r/Ud3WDm/3
const pathTestPattern = /^(?:\/[_\-=%a-zA-Z0-9]+)?\/data(?:-saver)?\/[a-fA-F0-9]+\/[^/?#\s]+$/;

export class RequestValidator {

    private readonly _tokenValidator: ITokenValidator;

    constructor(tokenValidator: ITokenValidator) {
        this._tokenValidator = tokenValidator;
    }

    private _verifyHost(hostname: string): boolean {
        return hostname.endsWith('.mangadex.network');
    }

    private _verifyReferer(referer: string | null): boolean {
        return !referer || new URL(referer).hostname.endsWith('mangadex.org');
    }

    private _verifyPattern(pathname: string): boolean {
        return pathTestPattern.test(pathname);
    }

    private _verifyToken(pathname: string): boolean {
        return this._tokenValidator.verifyToken(pathname);
    }

    private _verify(ctx: ParameterizedContext): boolean {
        return this._verifyHost(ctx.URL.hostname)
            && this._verifyReferer(ctx.get('referer'))
            && this._verifyPattern(ctx.URL.pathname)
            && this._verifyToken(ctx.URL.pathname);
    }

    private async _handler(ctx: ParameterizedContext, next: () => Promise<void>) {
        if(this._verify(ctx)) {
            console.info(`[REQUEST From: ${ctx.ip}]`, '<=', ctx.URL.href);
            await next();
        } else {
            console.info(`[BLOCKED From: ${ctx.ip}]`, '<=', ctx.URL.href, '@', ctx.get('referer'));
            ctx.status = 403;
            ctx.body = 'Forbidden';
        }
    }

    public get handler() {
        return this._handler.bind(this);
    }
}