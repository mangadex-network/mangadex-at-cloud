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
        //console.log('MOCK >> RemoteController.disconnect()');
        let uri = new URL('/stop', this._configuration.controlServer);
        const request = new Request(uri.href, {
            method: 'POST',
            body: this._configuration.createStopRequestPayload(),
            headers: {
                'User-Agent': this.identifier,
                'Content-Type': 'application/json'
            }
        });
        console.log('STOP', '=>', request);
        const response = await fetch(request);
        let dbg = await response.json();
        console.log('STOP', '<=', dbg);
        /*
        if(this._keepAliveTimer) {
            clearInterval(this._keepAliveTimer);
            this._keepAliveTimer = null;
        }
        let uri = new URL('/stop', CONTROL_SERVER_API_URL);
        let payload = { 'secret': this._clientKey };
        let request = new Request(uri.href, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'User-Agent': this.clientAgent,
                'Content-Type': 'application/json'
            }
        });
        logger.info('[REQUEST To: RPC]', '=>', request.url);
        let response = await fetch(request);
        let data = await response.text();
        if(response.ok) {
            logger.info('[RESPONSE From: RPC]', '<=', 'Successfully received confirmation for <stop> from control server');
        } else {
            throw new Error('Failed to receive confirmation for <stop> from control server!' + EOL + data);
        }
        */
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
        console.log('PING', '=>', request);
        const response = await fetch(request);
        let dbg = await response.json();
        console.log('PING', '<=', dbg);
        await this._configuration.parsePingResponsePayload(dbg);
        console.log('CONFIG:', this._configuration.clientOptions);
        return this._configuration.clientOptions;
    }

    public getImageURL(pathname: string, origin?: string): URL {
        // TODO: strip off token from pathname ...
        return new URL(pathname.replace(/.*\/data/, '/data'), origin || this._configuration.imageServer);
    }
}