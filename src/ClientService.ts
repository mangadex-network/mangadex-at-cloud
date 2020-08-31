import { delay, Oak } from './deps.ts';
import { ExceptionCatcher } from "./handlers/ExceptionCatcher.ts";
import { ResponseTimeDecorator } from "./handlers/ResponseTimeDecorator.ts";
import { IRemoteController } from './RemoteController.ts';
import { CloudCacheServer } from "./handlers/CloudCacheServer.ts";
import { RequestValidator } from "./handlers/RequestValidator.ts";

interface IClientService {
    start(cdn: string): Promise<void>;
    stop(wait: number): Promise<void>;
}

export class ClientService implements IClientService {

    private readonly _remoteController: IRemoteController;
    private readonly _service: Oak;
    private _keepAliveTimer = 0;
    private _serviceAbortController = new AbortController();

    constructor(remoteController: IRemoteController) {
        this._remoteController = remoteController;
        this._service = new Oak();
    }

    private async _keepAliveTask() {
        await this._remoteController.ping();
        // TODO: update certificate when changed ...
    }

    public async start(cdn: string) {
        this._service.use(new ExceptionCatcher().handler);
        this._service.use(new ResponseTimeDecorator().handler);
        this._service.use(new RequestValidator().handler);
        this._service.use(new CloudCacheServer(this._remoteController, cdn).handler);
        this._service.addEventListener('listen', event => {
            console.log(`Started HTTPS Server ${event.hostname}:${event.port}`);
        });
        this._service.addEventListener('error', event => {
            console.warn('Unexpected Error Occured:', event.error);
            event.stopPropagation();
            //event.cancelBubble = true;
        });
        let options = await this._remoteController.connect();
        this._keepAliveTimer = setInterval(this._keepAliveTask.bind(this), 60000);
        await this._service.listen({ ...options, signal: this._serviceAbortController.signal });
    }

    public async stop(wait: number) {
        clearInterval(this._keepAliveTimer);
        await this._remoteController.disconnect();
        await delay(wait);
        this._serviceAbortController.abort();
    }
}