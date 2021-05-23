import { mock } from 'jest-mock-extended';
import { delay } from './deps';
import { RemoteController, EventType } from './RemoteController';
import { IRemoteControllerConfiguration } from './RemoteControllerConfiguration';
import { LogInit, LogLevel } from './Logger';
LogInit(LogLevel.None);

/*
jest.mock('node-fetch-lite');
import fetch from 'node-fetch-lite';
const { Response } = jest.requireActual('node-fetch-lite');
*/

describe('RemoteController', () => {

    describe('connect(...)', () => {

        it.skip('Should send start payload', async () => {
            //
        });
    });

    describe('disconnect(...)', () => {

        it.skip('Should send stop payload', async () => {
            //
        });
    });

    describe('on(cert, ...)', () => {

        it.skip('Should be raised when changed certificate', async () => {
            const fixture = new TestFixture();
            const testee = fixture.createTestee('https://cdn.mangadex.org', null, 25);

            // mock fetch to return a random cert on each request, e.g. Date.now().toString(16) or new Date().toISOString()
            // fetch.mockReturnValue(Promise.resolve(new Response('{}')));
            await testee.connect();
            let ticked = 0;
            const callback = () => ticked++;
            testee.on(EventType.CertificateChanged, callback);
            await delay(40);

            expect(ticked).toBe(1);
        });

        it.skip('Should not be raised when same certificate', async () => {
            const fixture = new TestFixture();
            const testee = fixture.createTestee('https://cdn.mangadex.org', null, 25);

            // mock fetch to return the same cert on each request
            // fetch.mockReturnValue(Promise.resolve(new Response('{}')));
            await testee.connect();
            let ticked = 0;
            const callback = () => ticked++;
            testee.on(EventType.CertificateChanged, callback);
            await delay(100);

            expect(ticked).toBe(0);
        });
    });

    describe('off(cert, ...)', () => {

        it.skip('Should not be raised when changed certificate', async () => {
            const fixture = new TestFixture();
            const testee = fixture.createTestee('https://cdn.mangadex.org', null, 25);

            // mock fetch to return a random cert on each request, e.g. Date.now().toString(16) or new Date().toISOString()
            // fetch.mockReturnValue(Promise.resolve(new Response('{}')));
            await testee.connect();
            let ticked = 0;
            const callback = () => ticked++;
            testee.on(EventType.CertificateChanged, callback);
            testee.off(EventType.CertificateChanged, callback);
            await delay(100);

            expect(ticked).toBe(0);
        });
    });

    describe('getImageURL(...)', () => {

        it('Should reduce path with "/data" part', async () => {
            const fixture = new TestFixture();
            let testee = fixture.createTestee('https://cdn.mangadex.org', null);
            expect(testee.getImageURL('/data/chapter/image.png').href).toBe('https://cdn.mangadex.org/data/chapter/image.png');
            expect(testee.getImageURL('/data-saver/chapter/image.png').href).toBe('https://cdn.mangadex.org/data-saver/chapter/image.png');
            expect(testee.getImageURL('/token/data/chapter/image.png').href).toBe('https://cdn.mangadex.org/data/chapter/image.png');
            expect(testee.getImageURL('/token/data-saver/chapter/image.png').href).toBe('https://cdn.mangadex.org/data-saver/chapter/image.png');
        });

        it('Should keep path without "/data" part', async () => {
            const fixture = new TestFixture();
            let testee = fixture.createTestee('https://cdn.mangadex.org', null);
            expect(testee.getImageURL('/').href).toBe('https://cdn.mangadex.org/');
            expect(testee.getImageURL('/foo/bar').href).toBe('https://cdn.mangadex.org/foo/bar');
            expect(testee.getImageURL('/foo/bar/chapter/image.png').href).toBe('https://cdn.mangadex.org/foo/bar/chapter/image.png');
            expect(testee.getImageURL('/foo/bar-saver/chapter/image.png').href).toBe('https://cdn.mangadex.org/foo/bar-saver/chapter/image.png');
        });
    });

    describe('verifyToken(...)', () => {

        it('Should accept valid token when token verification is enabled', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', nacl.key);
            expect(testee.verifyToken('af09', nacl.validToken)).toBe(true);
        });

        it('Should reject empty chapter hash', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', nacl.key);
            expect(testee.verifyToken('', nacl.validToken)).toBe(false);
        });

        it('Should reject non-matching chapter hash', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', nacl.key);
            expect(testee.verifyToken('09af', nacl.validToken)).toBe(false);
        });

        it('Should reject empty token', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', nacl.key);
            expect(testee.verifyToken('af09', '')).toBe(false);
        });

        it('Should reject expired token', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', nacl.key);
            expect(testee.verifyToken('af09', nacl.expiredToken)).toBe(false);
        });
    });
});

class TestFixture {

    public readonly configurationMock = mock<IRemoteControllerConfiguration>();

    public createTestee(imageServer: string, tokenKey: Uint8Array, interval?: number): RemoteController {
        Object.defineProperty(this.configurationMock, 'imageServer', { get: () => imageServer });
        Object.defineProperty(this.configurationMock, 'tokenKey', { get: () => tokenKey });
        return new RemoteController(this.configurationMock, interval);
    }
}

class NaclMock {
    // test data created with: https://tweetnacl.js.org/#/secretbox
    private readonly _key = Buffer.from('F0Lz7blpECF01760+W4AcTaUmB/jELzQVE47t520EiQ=', 'base64') as Uint8Array;
    private readonly _nonce = Buffer.from('DU1Y+ji2/AuhWaMswzq5LoLJGoWF+A6a', 'base64') as Uint8Array;
    private readonly _samples = {
        // => '{ "expires": "3000-01-01T00:00:00.000Z", "hash": "af09" }'
        valid: Buffer.from('dkl6l1cB7vUvG90TBCLuh9kLFP895aZNBd8vwUSdRTxBO97zZOMpRtfpBbo5VJTgJXwXvPSLMv2DiqZNNKWBQac/MrdWFOm4Bg==', 'base64') as Uint8Array,
        // => '{ "expires": "2000-01-01T00:00:00.000Z", "hash": "af09" }'
        expired: Buffer.from('QRFmLb+sPlgw2g0yQEkJ8NkhFrpn8LdPCd5oiEaFVi5DO8PzeP4oWrPoYbA5Xp7gL2IXovThIIuBhMQMZ+/LGvR1cetGD6r+S2i9rdE=', 'base64') as Uint8Array,
    };

    private _createToken(nonce: Uint8Array, encrypted: Uint8Array): string {
        return Buffer.from([ ...nonce, ...encrypted ]).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    }

    public get key(): Uint8Array {
        return this._key;
    }

    public get validToken(): string {
        return this._createToken(this._nonce, this._samples.valid);
    }

    public get expiredToken(): string {
        return this._createToken(this._nonce, this._samples.expired);
    }
}