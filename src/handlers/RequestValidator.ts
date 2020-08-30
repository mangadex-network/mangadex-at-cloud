import { Context } from '../deps.ts';

export class RequestValidator {

    constructor() {
        //
    }

    private _verifyHost(ctx: Context<Record<string, any>>): boolean {
        return true;
    }

    private _verifyReferer(ctx: Context<Record<string, any>>): boolean {
        return true;
    }

    private _verifyPattern(ctx: Context<Record<string, any>>): boolean {
        return true;
    }

    private _verifyToken(ctx: Context<Record<string, any>>): boolean {
        return true;
    }

    private async _handler(ctx: Context<Record<string, any>>, next: () => Promise<void>) {
        if(this._verifyHost(ctx) && this._verifyReferer(ctx) && this._verifyPattern(ctx) && this._verifyToken(ctx)) {
            await next();
        } else {
            ctx.response.status = 403;
            ctx.response.body = 'Forbidden';
        }
    }

    public get handler() {
        return this._handler.bind(this);
    }
}