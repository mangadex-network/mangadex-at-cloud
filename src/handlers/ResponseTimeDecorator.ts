import { Context } from '../deps.ts';

export class ResponseTimeDecorator {

    constructor() {
        //
    }

    private async _handler(ctx: Context<Record<string, any>>, next: () => Promise<void>) {
        const start = Date.now();
        await next();
        const elapsed = Date.now() - start;
        ctx.response.headers.set('X-Response-Time', elapsed + 'ms');
    }

    public get handler() {
        return this._handler.bind(this);
    }
}