import { mock } from 'jest-mock-extended';
import { ParameterizedContext } from 'koa';
import { ResponseTimeDecorator } from './ResponseTimeDecorator';
import { LogInit, LogLevel } from '../Logger';
LogInit(LogLevel.None);

describe('ResponseTimeDecorator', () => {

    describe('handler(...)', () => {

        it('Should add response time header', async () => {
            let testee = new ResponseTimeDecorator();
            const contextMock = mock<ParameterizedContext>();
            await testee.handler(contextMock, async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
            });
            expect(contextMock.set).toBeCalledTimes(1);
            expect(contextMock.set).toBeCalledWith('X-Response-Time', expect.stringMatching(/^5[0-9]ms$/));
        });
    });
});