import { mock } from 'jest-mock-extended';
import { URL } from 'url';
import { ParameterizedContext } from 'koa';
import { RequestValidator } from './RequestValidator';
import { ITokenValidator } from '../RemoteController';
import { LogInit, LogLevel } from '../Logger';
LogInit(LogLevel.None);

describe('RemoteController', () => {

    describe('handler(...)', () => {

        it('Should accept valid requests (sunshine path)', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/token/data/af09/image.png`, 'https://mangadex.org');
            let testee = fixture.createTestee(true);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(200);
            expect(contextMock.body).toBe('OK');
        });

        it('Should reject requests with invalid token', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/token/data/af09/image.png`, 'https://mangadex.org');
            let testee = fixture.createTestee(false);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
            expect(fixture.remoteControllerMock.verifyToken).toBeCalledWith('af09', 'token');
        });

        it('Should reject requests without token', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/data/af09/image.png`, 'https://mangadex.org');
            let testee = fixture.createTestee(false);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
            expect(fixture.remoteControllerMock.verifyToken).toBeCalledWith('af09', '');
        });

        it('Should reject requests from localhost', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://localhost:44300/token/data/af09/image.png`, 'https://mangadex.org');
            let testee = fixture.createTestee(true);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests from invalid host', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.fun:44300/token/data/af09/image.png`, 'https://mangadex.org');
            let testee = fixture.createTestee(true);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should accept requests with empty referer', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/token/data/af09/image.png`, '');
            let testee = fixture.createTestee(true);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(200);
            expect(contextMock.body).toBe('OK');
        });

        it('Should reject requests with invalid referer', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/token/data/af09/image.png`, 'https://mangadex.fun');
            let testee = fixture.createTestee(true);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with invalid data pattern', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/token/data-data/af09/image.png`, '');
            let testee = fixture.createTestee(true);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with invalid chapter pattern', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/token/data/xxxxxxxx/image.png`, '');
            let testee = fixture.createTestee(true);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with invalid image pattern', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/token/data/af09/image.png/800`, '');
            let testee = fixture.createTestee(true);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });

        it('Should reject requests with to many path segments', async () => {
            const fixture = new TestFixture();
            const contextMock = fixture.createParameterizedContext(`https://foo.bar.mangadex.network:44300/nonce/token/data/af09/image.png`, '');
            let testee = fixture.createTestee(true);
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(403);
            expect(contextMock.body).toBe('Forbidden');
        });
    });
});

class TestFixture {

    public readonly remoteControllerMock = mock<ITokenValidator>();

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

    public createTestee(validToken: boolean): RequestValidator {
        this.remoteControllerMock.verifyToken.mockReturnValue(validToken);
        return new RequestValidator(this.remoteControllerMock);
    }
}