import { ListenOptionsTls } from './deps.ts';

const CONTROL_SERVER = 'https://api.mangadex.network';
const CLIENT_VERSION = '1.2.2';
const CLIENT_BUILD = 19;

interface IRequestPayload {
    secret: string;
    port: number;
    disk_space: number; // in Byte, must be larger than 60 * 1024 * 1024 * 1024
    network_speed: 0; // in ???, use 0 for unmetered (use server side maximum)
    build_version: number;
    tls_created_at?: string;
}

interface IResponsePayload {
    paused: boolean;
    compromised: boolean;
    latest_build: number;
    image_server: string;
    url: string;
    token_key: string;
    tls?: {
        created_at: string;
        private_key: string;
        certificate: string;
    }
}

export interface IRemoteControllerConfiguration {
    readonly clientOptions: ListenOptionsTls;
    readonly tokenKey?: Uint8Array;
    readonly imageServer: string;
    readonly controlServer: string;
    readonly identifier: string;
    createStopRequestPayload(): string;
    createPingRequestPayload(): string;
    parsePingResponsePayload(data: IResponsePayload): Promise<void>;
}

export class RemoteControllerConfiguration implements IRemoteControllerConfiguration {

    private readonly _secret: string;
    private readonly _diskspace: number; // in Byte, must be larger than 60 * 1024 * 1024 * 1024
    private readonly _networkspeed: number;
    private readonly _controlServer: string = CONTROL_SERVER;
    private readonly _identifier = `Mangadex@Home Node ${CLIENT_VERSION} (${CLIENT_BUILD})`; // `MangaDex@Cloud ${CLIENT_VERSION} (${CLIENT_BUILD}) - Powered by deno.land`;
    private _hostname: string = 'localhost';
    private _port: number;
    private _imageServer: string = '';
    private _tlsCreationTime?: string;
    private _tlsCert: string = '';
    private _tlsKey: string = '';
    private _tokenKey?: Uint8Array;

    constructor(secret: string, port: number, diskspace?: number, networkspeed?: number) {
        this._secret = secret;
        this._port = port;
        this._diskspace = diskspace || 1099511627776; // defaults to 1 TB
        this._networkspeed = networkspeed || 0;
    }

    public get clientOptions(): ListenOptionsTls {
        return {
            hostname: '0.0.0.0', // this._hostname,
            port: this._port,
            secure: true,
            certFile: this._tlsCert,
            keyFile: this._tlsKey
        }
    }

    public get tokenKey(): Uint8Array | undefined {
        return this._tokenKey;
    }

    public get imageServer(): string {
        return this._imageServer;
    }

    public get controlServer(): string {
        return this._controlServer;
    }

    public get identifier(): string {
        return this._identifier;
    }

    public createStopRequestPayload(): string {
        return JSON.stringify({ secret: this._secret });
    }

    public createPingRequestPayload(): string {
        const payload = {
            secret: this._secret,
            port: this._port,
            disk_space: this._diskspace,
            network_speed: this._networkspeed,
            build_version: CLIENT_BUILD
        } as IRequestPayload;

        if(this._tlsCreationTime) {
            payload.tls_created_at = this._tlsCreationTime;
        }

        return JSON.stringify(payload);
    }

    private async _createTempFile(content: string): Promise<string> {
        let file = await Deno.makeTempFile();
        await Deno.writeTextFile(file, content);
        return file;
    }

    public async parsePingResponsePayload(data: IResponsePayload): Promise<void> {
        if(data.paused) {
            console.warn(`The client is marked as paused and will no longer receive requests! Check if the key has been changed and try restarting the client.`);
        }
        if(data.compromised) {
            console.warn(`The client is marked as compromised and will no longer receive requests! Check if the key has been changed and try restarting the client.`);
        }
        if(data.latest_build > CLIENT_BUILD) {
            console.warn(`Your current client build ${CLIENT_BUILD} does not match the latest build ${data.latest_build}. Please check if an updated client is available!`);
        }

        const uri = new URL(data.url);
        this._hostname = uri.hostname;
        this._port = parseInt(uri.port) || 443;
        this._imageServer = data.image_server;
        this._tokenKey = new Uint8Array(32); // atob(data.token_key);

        if(data.tls) {
            this._tlsCreationTime = data.tls.created_at || this._tlsCreationTime;
            this._tlsCert = data.tls.certificate ? await this._createTempFile(data.tls.certificate) : this._tlsCert;
            this._tlsKey = data.tls.private_key ? await this._createTempFile(data.tls.private_key) : this._tlsKey;
        }
    }
}