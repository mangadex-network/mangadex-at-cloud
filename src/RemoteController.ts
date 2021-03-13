import { URL } from 'url';
import nacl = require('tweetnacl');
import fetch, { Request } from 'node-fetch-lite';
import { ListenOptionsTls } from './deps';
import { ClientIdentifier, IRemoteControllerConfiguration } from './RemoteControllerConfiguration';

// => https://gitlab.com/mangadex-pub/mangadex_at_home/-/raw/master/src/main/kotlin/mdnet/server/ImageServer.kt
const excludedTokenVerificationChapters = [
    '/1b682e7b24ae7dbdc5064eeeb8e8e353/',
    '/8172a46adc798f4f4ace6663322a383e/'
];

export interface ITokenValidator {
    verifyToken(pathname: string): boolean;
}

export interface IUpstreamProvider {
    getImageURL(pathname: string): URL;
}

export interface IRemoteController {
    connect(): Promise<ListenOptionsTls>;
    disconnect(): Promise<void>;
}

export class RemoteController implements IRemoteController, ITokenValidator, IUpstreamProvider {

    private readonly _configuration: IRemoteControllerConfiguration;
    private _keepAliveTimer: NodeJS.Timeout = null;
    private _isConnected: boolean = false;

    constructor(configuration: IRemoteControllerConfiguration) {
        this._configuration = configuration;
    }

    private async _keepAliveTask() {
        try {
            const options = await this._ping();
            // TODO: send event to subscribers when certain options changed (e.g. ssl cert)
            // this._configuration.clientOptions.cert;
            //this._service.setSecureContext(options);
            //console.info('Updated client SSL certificate');
        } catch(error) {
            console.warn('An unexpected Error occured during Configuration Update:', error);
        }
    }

    public async connect(): Promise<ListenOptionsTls> {
        if(this._isConnected) {
            console.warn('RemoteController.connect()', '=>', 'Cannot connect when already connected!');
        } else {
            this._isConnected = true;
            this._keepAliveTimer = setInterval(this._keepAliveTask.bind(this), 60000);
            return this._ping();
        }
    }

    public async disconnect() {
        if(!this._isConnected) {
            console.warn('RemoteController.disconnect()', '=>', 'Cannot disconnect when already disconnected!');
        } else {
            this._isConnected = false;
            clearInterval(this._keepAliveTimer);
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

    private async _ping(): Promise<ListenOptionsTls> {
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

    private _shouldCheckToken(path: string): boolean {
        return this._configuration.tokenCheckEnabled && !excludedTokenVerificationChapters.some(hash => path.includes(hash));
    }

    private _decryptToken(token: string): { expires: string, hash: string } {
        const decoded = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64') as Uint8Array;
        const decrypted = nacl.secretbox.open(decoded.slice(24), decoded.slice(0, 24), this._configuration.tokenKey);
        return JSON.parse(Buffer.from(decrypted).toString('utf8'));
    }

    public verifyToken(pathname: string): boolean {
        if(this._shouldCheckToken(pathname)) {
            try {
                const token = decodeURI(pathname.split('/').slice(-4).shift() || '');
                const data = this._decryptToken(token);
                const chapter = decodeURI(pathname.split('/').slice(-2).shift());
                return new Date(data.expires) > new Date() && data.hash === chapter;
            } catch(error) {
                return false;
            }
        } else {
            return true;
        }
    }
}