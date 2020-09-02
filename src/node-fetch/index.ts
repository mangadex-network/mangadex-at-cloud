/***********************************************************************************************
 *** A very basic API compatible stub replacement for node-fetch, as node-fetch leaks memory ***
 ***********************************************************************************************/ 

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

/*
// Ad-Hos Test: `npm run build:debug && node ./dist/node-fetch/index.js`
(async function test() {
    let request = new Request('https://ipinfo.io/json');
    let response = await fetch(request);
    console.log('HEADERS:', response.headers.get('Content-Type'), '=>', response.headers.get('content-length'));
    //console.log('TEXT:', await response.text());
    console.log('JSON:', await response.json());
})();
*/