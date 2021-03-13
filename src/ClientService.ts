import * as Koa from 'koa';
import * as https from 'https';
import { delay } from './deps';
import { ExceptionCatcher } from './handlers/ExceptionCatcher';
import { ResponseTimeDecorator } from './handlers/ResponseTimeDecorator';
import { RequestValidator } from './handlers/RequestValidator';
import { CreateCacheProvider } from './handlers/ImageProvider';
import { RemoteController } from './RemoteController';

interface IClientService {
    start(cache: string, size: number): Promise<void>;
    stop(wait: number): Promise<void>;
}

export class ClientService implements IClientService {

    private readonly _remoteController: RemoteController;
    private _service: https.Server;

    constructor(remoteController: RemoteController) {
        this._remoteController = remoteController;
        this._service
    }

    public async start(cache: string, size: number) {
        const app = new Koa();
        app.silent = true;
        app.use(new ExceptionCatcher().handler);
        app.use(new ResponseTimeDecorator().handler);
        app.use(new RequestValidator(this._remoteController).handler);
        app.use(CreateCacheProvider(this._remoteController, cache, size).handler);
        app.on('error', (error: any, ctx?: Koa.ParameterizedContext) => {
            if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
                console.warn(`Connection aborted by endpoint (${error.code})!`, ctx ? ctx.url : null);
            } else {
                console.error('An unexpected Error occured within the Koa Framework:', error);
            }
        });
        let options = await this._remoteController.connect();
        this._service = https.createServer(options, app.callback());
        this._service.listen(options.port, options.hostname, () => {
            console.log(`Started HTTPS Server ${options.hostname}:${options.port}`);
        });
    }

    public async stop(wait: number) {
        await this._remoteController.disconnect();
        await delay(wait);
        this._service.close(error => {});
    }
}