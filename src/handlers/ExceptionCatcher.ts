import { Context } from '../deps.ts';

export class ExceptionCatcher {

    private async _handler(ctx: Context<Record<string, any>>, next: () => Promise<void>) {
        try {
            await next();
        } catch(error) {
            console.error('An unexpected Error occured within a Middleware Handler:', error);
            ctx.response.status = error.status || 500;
            ctx.response.body = error.message;
        }
    }

    public get handler() {
        return this._handler.bind(this);
    }
}