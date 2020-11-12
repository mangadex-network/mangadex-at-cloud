import * as Koa from 'koa';
import * as https from 'https';
import { delay } from './deps';
import { ExceptionCatcher } from './handlers/ExceptionCatcher';
import { ResponseTimeDecorator } from './handlers/ResponseTimeDecorator';
import { RequestValidator } from './handlers/RequestValidator';
import { CreateCacheProvider } from './handlers/ImageProvider';
import { IRemoteController } from './RemoteController';

interface IClientService {
    start(cache: string, size: number): Promise<void>;
    stop(wait: number): Promise<void>;
}

export class ClientService implements IClientService {

    private readonly _remoteController: IRemoteController;
    private _service: https.Server;
    private _keepAliveTimer: NodeJS.Timeout;

    constructor(remoteController: IRemoteController) {
        this._remoteController = remoteController;
        this._service
    }

    private async _keepAliveTask() {
        try {
            const options = await this._remoteController.ping();
            // TODO: update certificate when changed ...
            //this._service.setSecureContext(options);
            //console.info('Updated client SSL certificate');
        } catch(error) {
            console.warn('An unexpected Error occured during Configuration Update:', error);
        }
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
        this._keepAliveTimer = setInterval(this._keepAliveTask.bind(this), 60000);
        this._service = https.createServer(options, app.callback());
        this._service.listen(options.port, options.hostname, () => {
            console.log(`Started HTTPS Server ${options.hostname}:${options.port}`);
        });
    }

    public async stop(wait: number) {
        clearInterval(this._keepAliveTimer);
        await this._remoteController.disconnect();
        await delay(wait);
        this._service.close(error => {});
    }
}