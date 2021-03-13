import { URL } from 'url';
import { EventEmitter } from 'events';
import nacl = require('tweetnacl');
import fetch, { Request } from 'node-fetch-lite';
import { ListenOptionsTls } from './deps';
import { ClientIdentifier, IRemoteControllerConfiguration } from './RemoteControllerConfiguration';

export interface ITokenValidator {
    verifyToken(chapter: string, token: string): boolean;
}

export interface IUpstreamProvider {
    getImageURL(pathname: string): URL;
}

export enum EventType {
    CertificateChanged = 'cert'
}

export interface IRemoteController {
    connect(): Promise<ListenOptionsTls>;
    disconnect(): Promise<void>;
}

export class RemoteController extends EventEmitter implements IRemoteController, ITokenValidator, IUpstreamProvider {

    private readonly _configuration: IRemoteControllerConfiguration;
    private _keepAliveTimer: NodeJS.Timeout = null;

    constructor(configuration: IRemoteControllerConfiguration) {
        super();
        this._configuration = configuration;
    }

    private async _keepAliveTask() {
        try {
            const cert = this._configuration.clientOptions.cert;
            await this._ping();
            if(cert !== this._configuration.clientOptions.cert) {
                this.emit(EventType.CertificateChanged, this._configuration.clientOptions.cert);
            }
        } catch(error) {
            console.warn('An unexpected Error occured during Configuration Update:', error);
        }
    }

    public async connect(): Promise<ListenOptionsTls> {
        if(this._keepAliveTimer) {
            console.warn('RemoteController.connect()', '=>', 'Cannot connect when already connected!');
        } else {
            this._keepAliveTimer = setInterval(this._keepAliveTask.bind(this), 60000);
            await this._ping();
            return this._configuration.clientOptions;
        }
    }

    public async disconnect() {
        if(!this._keepAliveTimer) {
            console.warn('RemoteController.disconnect()', '=>', 'Cannot disconnect when already disconnected!');
        } else {
            clearInterval(this._keepAliveTimer);
            this._keepAliveTimer = null;
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
    }

    private async _ping(): Promise<void> {
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
    }

    public getImageURL(pathname: string): URL {
        return new URL(pathname.replace(/.*\/data/, '/data'), this._configuration.imageServer);
    }

    public verifyToken(chapter: string, token: string): boolean {
        if(this._configuration.tokenCheckEnabled) {
            try {
                const decoded = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64') as Uint8Array;
                const decrypted = nacl.secretbox.open(decoded.slice(24), decoded.slice(0, 24), this._configuration.tokenKey);
                const data = JSON.parse(Buffer.from(decrypted).toString('utf8'));
                return new Date(data.expires) > new Date() && data.hash === chapter;
            } catch(error) {
                return false;
            }
        } else {
            return true;
        }
    }
}