import { assert, assertEquals, assertArrayContains } from '../deps.ts';
import { RequestValidator } from './RequestValidator.ts';

Deno.test({
    name: 'RequestValidator.handler() - Should bla bla bla',
    //sanitizeResources: false,
    //sanitizeOps: false,
    fn: async function() {
        let testee = new RequestValidator();
        testee.handler(null, async () => {
            throw new Error('');
        });
    }
});