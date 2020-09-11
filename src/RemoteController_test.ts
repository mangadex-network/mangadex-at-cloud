import { mock } from 'jest-mock-extended';
import { RemoteController } from './RemoteController';
import { IRemoteControllerConfiguration } from './RemoteControllerConfiguration';

describe('RemoteController', () => {

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

    describe('decryptToken(...)', () => {

        it('Should decrypt valid token', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', nacl.key);
            const decrypted = testee.decryptToken(nacl.validToken);
            expect(decrypted.expires).toBe('3000-01-01T00:00:00.000Z');
            expect(decrypted.hash).toBe('af09');
        });

        it('Should decrypt expired token', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', nacl.key);
            const decrypted = testee.decryptToken(nacl.expiredToken);
            expect(decrypted.expires).toBe('2000-01-01T00:00:00.000Z');
            expect(decrypted.hash).toBe('af09');
        });

        it('Should throw when key null', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', null);
            expect(() => testee.decryptToken(nacl.validToken)).toThrowError(/unexpected type/i);
        });

        it('Should throw when key invalid', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', new Uint8Array([ 1, 2, 3, 4, 5, 6, 7, 8 ]));
            expect(() => testee.decryptToken(nacl.validToken)).toThrowError(/bad key size/i);
        });

        it('Should throw when token null', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', nacl.key);
            expect(() => testee.decryptToken(null)).toThrowError(/cannot read property .* of null/i);
        });

        it('Should throw when token invalid', async () => {
            const fixture = new TestFixture();
            const nacl = new NaclMock();
            let testee = fixture.createTestee('https://cdn.mangadex.org', nacl.key);
            expect(() => testee.decryptToken('x'.repeat(128))).toThrowError(/must be one of type/i);
        });
    });
});

class TestFixture {

    public readonly configurationMock = mock<IRemoteControllerConfiguration>();

    public createTestee(imageServer: string, tokenKey: Uint8Array): RemoteController {
        Object.defineProperty(this.configurationMock, 'imageServer', { get: () => imageServer });
        Object.defineProperty(this.configurationMock, 'tokenKey', { get: () => tokenKey });
        return new RemoteController(this.configurationMock);
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