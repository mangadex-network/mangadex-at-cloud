import { mock } from 'jest-mock-extended';
import { URL } from 'url';
import { ParameterizedContext } from 'koa';
import { RequestValidator } from './RequestValidator';
import { IRemoteController } from '../RemoteController';
import { LogInit, LogLevel } from '../Logger';
LogInit(LogLevel.None);

describe('RemoteController', () => {

    describe('handler(...)', () => {

        it('Should accept valid requests (sunshine path)', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/${nacl.validToken}/data/af09/image.png`, 'https://mangadex.org');
            let testee = fixture.createTestee({ expires: '3000-01-01T00:00:00.000Z', hash: 'af09' });
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(200);
            expect(contextMock.body).toBe('OK');
        });

        it('Should accept requests without token', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/data/af09/image.png`, 'https://mangadex.org');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(200);
            expect(contextMock.body).toBe('OK');
        });

        it('Should reject requests from localhost', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://localhost:44300/data/af09/image.png`, 'https://mangadex.org');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests from invalid host', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.fun:44300/data/af09/image.png`, 'https://mangadex.org');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should accept requests with empty referer', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/data/af09/image.png`, '');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(200);
            expect(contextMock.body).toBe('OK');
        });

        it('Should reject requests with invalid referer', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/data/af09/image.png`, 'https://mangadex.fun');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with expired token', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/${nacl.expiredToken}/data/af09/image.png`, '');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with invalid token pattern', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/${nacl.validToken.replace('_', '~')}/data/af09/image.png`, '');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with invalid data pattern', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/data-data/af09/image.png`, '');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with invalid chapter pattern', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/data/xxxxxxxx/image.png`, '');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with invalid image pattern', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/data/af09/image.png/800`, '');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with to many path segments', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/nonce/${nacl.validToken}/data/af09/image.png`, '');
            let testee = fixture.createTestee(null);
            testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });
    });
});

class TestFixture {

    public readonly remoteControllerMock = mock<IRemoteController>();

    public createParameterizedContext(url: string, referer: string): ParameterizedContext {
        const uri = new URL(url);
        const contextMock = mock<ParameterizedContext>();
        contextMock.state = {};
        Object.defineProperty(contextMock, 'URL', { get: () => uri });
        contextMock.hostname = uri.hostname;
        contextMock.get.calledWith('referer').mockReturnValue(referer);
        contextMock.body = undefined;
        return contextMock;
    }

    public createTestee(decodedToken: { expires: string, hash: string }): RequestValidator {
        this.remoteControllerMock.decryptToken.mockReturnValue(decodedToken);
        return new RequestValidator(this.remoteControllerMock);
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

const nacl = new NaclMock();
const testCases = [

];