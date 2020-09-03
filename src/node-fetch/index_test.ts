import fetch, { Request } from './index';

describe('fetch-node', () => {

    it('Should correctly call control server during start/stop', async () => {
        const request = new Request('https://dummyimage.com/8x8.png');
        let response = await fetch(request);
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Length')).toBe(137);
        expect(response.headers.get('content-type')).toBe('image/png');
    });
});

/*
(async function test() {
    let request = new Request('https://postman-echo.com/get?foo=bar');
    let response = await fetch(request);
    console.log('HEADERS:', response.headers.get('Content-Type'), '=>', response.headers.get('content-length'));
    //console.log('TEXT:', await response.text());
    console.log('JSON:', await response.json());
})();
*/