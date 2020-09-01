import { assert, assertEquals, assertArrayContains } from '../deps.ts';
import { ExceptionCatcher } from './ExceptionCatcher.ts';

Deno.test({
    name: 'ExceptionCatcher.handler() - Should bla bla bla',
    //sanitizeResources: false,
    //sanitizeOps: false,
    fn: async function() {
        let testee = new ExceptionCatcher();
        testee.handler(null, async () => {
            throw new Error('');
        });
    }
});