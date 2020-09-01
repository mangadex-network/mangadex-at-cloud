import { ServerOptions } from 'https';

export async function delay(wait: number) {
    return new Promise(resolve => setTimeout(resolve, wait).unref());
}

export interface ListenOptionsTls extends ServerOptions {
    hostname: string;
    port: number;
    secure: true;
}