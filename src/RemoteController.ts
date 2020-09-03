import { URL } from 'url';
import fetch, { Request } from 'node-fetch-lite';
import { ListenOptionsTls } from './deps';
import { IRemoteControllerConfiguration } from './RemoteControllerConfiguration';

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
        const payload = this._configuration.createStopRequestPayload()
        const request = new Request(uri.href, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'User-Agent': this.identifier,
                'Content-Type': 'application/json'
            }
        });
        console.info('[REQUEST To: RPC]', '=>', request.url);
        console.debug('RemoteController.disconnect()', '=>', request.method, request.url, payload);
        const response = await fetch(request);
        let data = await await response.json();
        console.info('[RESPONSE From: RPC]', '<=', response.ok, response.status);
        console.debug('RemoteController.disconnect()', '<=', response.status, data);
    }

    public async ping(): Promise<ListenOptionsTls> {
        let uri = new URL('/ping', this._configuration.controlServer);
        const payload = this._configuration.createPingRequestPayload();
        const request = new Request(uri.href, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'User-Agent': this.identifier,
                'Content-Type': 'application/json'
            }
        });
        console.info('[REQUEST To: RPC]', '=>', request.url);
        console.debug('RemoteController.ping()', '=>', request.method, request.url, payload);
        const response = await fetch(request);
        let data = await response.json();
        await this._configuration.parsePingResponsePayload(data);
        console.info('[RESPONSE From: RPC]', '<=', response.ok, response.status);
        console.debug('RemoteController.ping()', '<=', response.status, data);
        return this._configuration.clientOptions;
    }

    public getImageURL(pathname: string, origin?: string): URL {
        return new URL(pathname.replace(/.*\/data/, '/data'), origin || this._configuration.imageServer);
    }
}