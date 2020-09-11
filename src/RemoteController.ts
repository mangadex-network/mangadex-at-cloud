import { URL } from 'url';
import fetch, { Request } from 'node-fetch-lite';
import { ListenOptionsTls } from './deps';
import { ClientIdentifier, IRemoteControllerConfiguration } from './RemoteControllerConfiguration';
import nacl = require('tweetnacl');

export interface IRemoteController {
    connect(): Promise<ListenOptionsTls>;
    ping(): Promise<ListenOptionsTls>;
    disconnect(): Promise<void>;
    getImageURL(pathname: string, origin?: string): URL;
    decryptToken(token: string): { expires: string, hash: string };
}

export class RemoteController implements IRemoteController {

    private readonly _configuration: IRemoteControllerConfiguration;

    constructor(configuration: IRemoteControllerConfiguration) {
        this._configuration = configuration;
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
                'User-Agent': ClientIdentifier,
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
                'User-Agent': ClientIdentifier,
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

    public getImageURL(pathname: string): URL {
        return new URL(pathname.replace(/.*\/data/, '/data'), this._configuration.imageServer);
    }

    public decryptToken(token: string): { expires: string, hash: string } {
        const decoded = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64') as Uint8Array;
        const decrypted = nacl.secretbox.open(decoded.slice(24), decoded.slice(0, 24), this._configuration.tokenKey);
        return JSON.parse(Buffer.from(decrypted).toString('utf8'));
    }
}