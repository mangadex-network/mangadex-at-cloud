import { Oak, listenAndServeTLS } from './deps.ts';
import { ExceptionCatcher } from "./handlers/ExceptionCatcher.ts";
import { ResponseTimeDecorator } from "./handlers/ResponseTimeDecorator.ts";
import { IRemoteController } from './RemoteController.ts';
import { CloudCacheServer } from "./handlers/CloudCacheServer.ts";

interface IClientService {
    start(cdn: string): Promise<void>;
    stop(timeout: number): Promise<void>;
}

export class ClientService implements IClientService {

    private readonly _remoteController: IRemoteController;
    private readonly _service: Oak;

    constructor(remoteController: IRemoteController) {
        this._remoteController = remoteController;
        this._service = new Oak();
    }

    public async start(cdn: string) {
        this._service.use(new ExceptionCatcher().handler);
        this._service.use(new ResponseTimeDecorator().handler);
        this._service.use(new CloudCacheServer(this._remoteController, cdn).handler);
        this._service.addEventListener('listen', event => {
            console.log(`Started HTTPS Server ${event.hostname}:${event.port}`);
        });
        this._service.addEventListener('error', event => {
            console.warn('Unexpected Error Occured:', event.error);
            //event.cancelBubble = true;
        });
        let options = await this._remoteController.connect();
        await this._service.listen(options);
    }

    public async stop(timeout: number) {
        //this._service.
    }
}