import * as http from 'http';
import * as https from 'https';
import { Request } from './request';
import { Response } from './response';

export { Request };

export default async function fetch(request: Request): Promise<Response> {
    return new Promise((resolve, reject) => {
        const client: typeof https | typeof http = request.url.startsWith('https') ? https : http;
        let connection = client.request(request, response => {
            resolve(new Response(response));
        });
        connection.on('error', error => {
            //connection.destroy();
            //connection.abort();
            reject(error);
        });
        if(request.body) {
            connection.write(request.body);
        }
        connection.end();
    });
}