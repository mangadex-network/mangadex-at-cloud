import { delay, assert, assertEquals, assertArrayContains } from '../deps.ts';
import { ResponseTimeDecorator } from './ResponseTimeDecorator.ts';

Deno.test({
    name: 'ResponseTimeDecorator.handler() - Should measure response time and set header',
    //sanitizeResources: false,
    //sanitizeOps: false,
    fn: async function() {
        let testee = new ResponseTimeDecorator();
        testee.handler(null, async () => await delay(50));
        //assertArrayContains(testee, [ 1, 2, 3, 4 ]);
        //console.log('OK');
    }
});