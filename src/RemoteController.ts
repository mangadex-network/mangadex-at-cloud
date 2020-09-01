import { ListenOptionsTls } from './deps.ts';
import { IRemoteControllerConfiguration } from './RemoteControllerConfiguration.ts';

export interface IRemoteController {
    readonly identifier: string;
    connect(): Promise<ListenOptionsTls>;
    ping(): Promise<ListenOptionsTls>;
    disconnect(): Promise<void>;
    getImageURL(pathname: string, origin?: string): URL;
}

export class RemoteController implements IRemoteController {

    private readonly _configuration: IRemoteControllerConfiguration;

    constructor(configuration: IRemoteControllerConfiguration) {
        this._configuration = configuration;
    }

    public get identifier(): string {
        return this._configuration.identifier;
    }

    public async connect(): Promise<ListenOptionsTls> {
        return this.ping();
    }

    public async disconnect() {
        let uri = new URL('/stop', this._configuration.controlServer);
        const request = new Request(uri.href, {
            method: 'POST',
            body: this._configuration.createStopRequestPayload(),
            headers: {
                'User-Agent': this.identifier,
                'Content-Type': 'application/json'
            }
        });
        console.debug('RemoteController.disconnect()', '=>', request);
        const response = await fetch(request);
        let data = await await response.json();
        console.debug('RemoteController.disconnect()', '<=', response.status, data);
    }

    public async ping(): Promise<ListenOptionsTls> {
        let uri = new URL('/ping', this._configuration.controlServer);
        const request = new Request(uri.href, {
            method: 'POST',
            body: this._configuration.createPingRequestPayload(),
            headers: {
                'User-Agent': this.identifier,
                'Content-Type': 'application/json'
            }
        });
        console.debug('RemoteController.ping()', '=>', request);
        const response = await fetch(request);
        let data = await response.json();
        await this._configuration.parsePingResponsePayload(data);
        console.debug('RemoteController.ping()', '<=', response.status, data);
        return this._configuration.clientOptions;
    }

    public getImageURL(pathname: string, origin?: string): URL {
        return new URL(pathname.replace(/.*\/data/, '/data'), origin || this._configuration.imageServer);
    }
}