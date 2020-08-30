import { ListenOptionsTls } from './deps.ts';
import { IRemoteControllerConfiguration } from './RemoteControllerConfiguration.ts';

export interface IRemoteController {
    readonly identifier: string;
    connect(): Promise<ListenOptionsTls>;
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
        console.log('MOCK >> RemoteController.disconnect()');
    }

    public async ping(): Promise<ListenOptionsTls> {
        const request = new Request(this._configuration.controlServer, {
            method: 'POST',
            body: this._configuration.createRequestPayload(),
            headers: {
                'User-Agent': this.identifier,
                'Content-Type': 'application/json'
            }
        });
        //const response = await fetch(request);
        //this._configuration.parseResponsePayload(await response.json());
        
        //this._configuration.parseResponsePayload('');
        //return this._configuration.clientOptions;
        return {
            hostname: '127.0.0.1',
            port: 44300,
            secure: true,
            certFile: './test/localhost.crt',
            keyFile: './test/localhost.key'
        }
    }

    public getImageURL(pathname: string, origin?: string): URL {
        // TODO: strip off token from pathname ...
        return new URL(pathname, origin || this._configuration.imageServer);
    }
}