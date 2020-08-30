import { Context } from '../deps.ts';

export class ExceptionCatcher {

    constructor() {
        //
    }

    private async _handler(ctx: Context<Record<string, any>>, next: () => Promise<void>) {
        try {
            await next();
        } catch(error) {
            console.error('Unexpected error in middleware:', error);
            ctx.response.status = error.status || 500;
            ctx.response.body = error.message;
        }
    }

    public get handler() {
        return this._handler.bind(this);
    }
}