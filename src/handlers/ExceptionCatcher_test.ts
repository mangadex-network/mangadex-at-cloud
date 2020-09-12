import { mock } from 'jest-mock-extended';
import { ParameterizedContext } from 'koa';
import { ExceptionCatcher } from './ExceptionCatcher';
import { LogInit, LogLevel } from '../Logger';
LogInit(LogLevel.None);

describe('ExceptionCatcher', () => {

    describe('handler(...)', () => {

        it('Should not interfere on success', async () => {
            let testee = new ExceptionCatcher();
            const contextMock = { status: 0, body: '' };
            await testee.handler(contextMock, async () => {
                contextMock.status = 200;
                contextMock.body = 'OK';
            });
            expect(contextMock.status).toBe(200);
            expect(contextMock.body).toBe('OK');
        });

        it('Should catch any exception', async () => {
            let testee = new ExceptionCatcher();
            const contextMock = { status: 0, body: '' };
            await testee.handler(contextMock, async () => {
                throw new Error();
            });
            expect(contextMock.status).toBe(500);
            expect(contextMock.body).toBe('');
        });

        it('Should assign error properties', async () => {
            let testee = new ExceptionCatcher();
            const contextMock = { status: 0, body: '' };
            await testee.handler(contextMock, async () => {
                let error = new Error('Test Error');
                error['status'] = 555;
                throw error;
            });
            expect(contextMock.status).toBe(555);
            expect(contextMock.body).toBe('Test Error');
        });
    });
});