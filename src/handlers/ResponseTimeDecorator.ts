import { ParameterizedContext } from 'koa';

export class ResponseTimeDecorator {

    private async _handler(ctx: ParameterizedContext, next: () => Promise<void>) {
        const start = Date.now();
        await next();
        const elapsed = Date.now() - start;
        ctx.response.headers.set('X-Response-Time', elapsed + 'ms');
    }

    public get handler() {
        return this._handler.bind(this);
    }
}