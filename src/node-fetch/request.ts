import { URL } from 'url';
import * as http from 'http';
import * as https from 'https';

interface RequestInit {
    readonly method?: string;
    readonly body?: string;
    readonly headers?: http.OutgoingHttpHeaders;
}

export class Request implements https.RequestOptions {

    public readonly url: string;
    public readonly host: string;
    public readonly path: string;
    public readonly method: string;
    public readonly headers?: http.OutgoingHttpHeaders;
    public readonly body?: string;

    constructor(url: string, options?: RequestInit) {
        const uri = new URL(url);
        this.url = uri.href;
        this.host = uri.hostname;
        this.path = uri.pathname;
        this.method = ((options && options.method) || 'GET').toUpperCase();
        this.headers = (options && options.headers) || undefined;
        this.body = (options && options.body) || undefined;
    }
}