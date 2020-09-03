import * as http from 'http';
import * as stream from 'stream';
import { Headers } from './headers';

export class Response {

    private readonly _headers: Headers;
    private readonly _message: http.IncomingMessage;

    constructor(message: http.IncomingMessage) {
        this._message = message;
        this._headers = new Headers(this._message.headers);
    }

    public get ok(): boolean {
        return this._message.aborted ? false : true;
    }

    public get status(): number {
        return this._message.statusCode;
    }

    public get headers(): Headers {
        return this._headers;
    }

    public get body(): stream.Readable {
        return this._message;
    }

    private async bytes(): Promise<Uint8Array[]> {
        if(!this._message.readable) {
            throw new Error('Failed to read from stream!');
        }
        return await new Promise((resolve, reject) => {
            const chunks = [];
            this.body
                .on('error', reject)
                .on('data', chunk => chunks.push(chunk))
                .on('end', () => resolve(chunks));
        });
    }

    public async text(): Promise<string> {
        const bytes = await this.bytes();
        return Buffer.concat(bytes).toString('utf8');
    }

    public async json(): Promise<any> {
        const text = await this.text();
        return JSON.parse(text);
    }
}