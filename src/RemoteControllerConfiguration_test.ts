import { mock } from 'jest-mock-extended';
import { RemoteControllerConfiguration, IPingResponsePayload } from './RemoteControllerConfiguration';
import { LogInit, LogLevel } from './Logger';
LogInit(LogLevel.None);

describe('RemoteControllerConfiguration', () => {

    describe('handler(...)', () => {

        it('Should provide control server', async () => {
            let testee = new RemoteControllerConfiguration('', 0, 0, 0);
            expect(testee.controlServer).toBe('https://api.mangadex.network');
        });

        it('Should create valid initial ping request', async () => {
            let testee = new RemoteControllerConfiguration('xxxxxxxx', 44300, 1_000_000_000, 10_000_000);
            let actual = testee.createPingRequestPayload();
            expect(actual.secret).toBe('xxxxxxxx');
            expect(actual.port).toBe(44300);
            expect(actual.disk_space).toBe(85_899_345_920); // spoofed min. disk space required by mangadex
            expect(actual.network_speed).toBe(10_000_000);
            expect(actual.tls_created_at).toBeUndefined();
            expect(actual.build_version).toBe(29);
        });

        it('Should provide client configuration from ping response', async () => {
            let testee = new RemoteControllerConfiguration('xxxxxxxx', 44300, 0, 0);

            const successorMock = mock<IPingResponsePayload>();
            successorMock.url = 'https://foo.bar.mangadex.network';
            successorMock.tls.certificate = 'TestCertificate';
            successorMock.tls.private_key = 'TestPrivateKey';
            successorMock.token_key = '';
            testee.parsePingResponsePayload(successorMock);

            expect(testee.clientOptions.hostname).toBe('0.0.0.0');
            expect(testee.clientOptions.port).toBe(443); // port from ping response replaced initial port
            expect(testee.clientOptions.secure).toBeTruthy();
            expect(testee.clientOptions.cert).toBe('TestCertificate');
            expect(testee.clientOptions.key).toBe('TestPrivateKey');
        });

        it('Should create valid successive ping request', async () => {
            let testee = new RemoteControllerConfiguration('xxxxxxxx', 443, 100_000_000_000, 10_000_000);

            const successorMock = mock<IPingResponsePayload>();
            successorMock.url = 'https://foo.bar.mangadex.network:44300';
            successorMock.tls.created_at = 'TestTimeTLS';
            successorMock.token_key = '';
            testee.parsePingResponsePayload(successorMock);

            let actual = testee.createPingRequestPayload();
            expect(actual.secret).toBe('xxxxxxxx');
            expect(actual.port).toBe(44300); // port from ping response replaced initial port
            expect(actual.disk_space).toBe(100_000_000_000);
            expect(actual.network_speed).toBe(10_000_000);
            expect(actual.tls_created_at).toBe('TestTimeTLS');
            expect(actual.build_version).toBe(29);
        });

        it('Should create valid stop request', async () => {
            let testee = new RemoteControllerConfiguration('xxxxxxxx', 0, 0, 0);
            expect(testee.createStopRequestPayload().secret).toBe('xxxxxxxx');
        });

        it('Should provide image server from ping response', async () => {
            let testee = new RemoteControllerConfiguration('', 0, 0, 0);

            const successorMock = mock<IPingResponsePayload>();
            successorMock.url = 'https://foo.bar.mangadex.network:44300';
            successorMock.image_server = 'https://s2.mangadex.org';
            successorMock.token_key = 'xxxxxxxx';
            testee.parsePingResponsePayload(successorMock);

            expect(testee.imageServer).toBe('https://s2.mangadex.org');
        });

        it('Should provide token key from ping response', async () => {
            let testee = new RemoteControllerConfiguration('', 0, 0, 0);

            const successorMock = mock<IPingResponsePayload>();
            successorMock.url = 'https://foo.bar.mangadex.network';
            successorMock.token_key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
            testee.parsePingResponsePayload(successorMock);

            expect(testee.tokenKey.length).toBe(32);
            expect(testee.tokenKey.some(byte => byte > 0)).toBeFalsy();
        });

        it('Should enable token check when not in ping response', async () => {
            let testee = new RemoteControllerConfiguration('', 0, 0, 0);

            const successorMock = mock<IPingResponsePayload>();
            successorMock.url = 'https://foo.bar.mangadex.network';
            successorMock.token_key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
            successorMock.disable_tokens = undefined;
            testee.parsePingResponsePayload(successorMock);

            expect(testee.tokenCheckEnabled).toBe(true);
        });

        it('Should enable token check when not disabled in ping response', async () => {
            let testee = new RemoteControllerConfiguration('', 0, 0, 0);

            const successorMock = mock<IPingResponsePayload>();
            successorMock.url = 'https://foo.bar.mangadex.network';
            successorMock.token_key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
            successorMock.disable_tokens = false;
            testee.parsePingResponsePayload(successorMock);

            expect(testee.tokenCheckEnabled).toBe(true);
        });

        it('Should not enable token check when disabled in ping response', async () => {
            let testee = new RemoteControllerConfiguration('', 0, 0, 0);

            const successorMock = mock<IPingResponsePayload>();
            successorMock.url = 'https://foo.bar.mangadex.network';
            successorMock.token_key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
            successorMock.disable_tokens = true;
            testee.parsePingResponsePayload(successorMock);

            expect(testee.tokenCheckEnabled).toBe(false);
        });
    });
});