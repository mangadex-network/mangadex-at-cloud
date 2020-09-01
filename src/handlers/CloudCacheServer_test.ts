import { assert, assertEquals, assertArrayContains } from '../deps.ts';
import { CloudCacheServer } from './CloudCacheServer.ts';

Deno.test({
    name: 'CloudCacheServer.handler() - Should bla bla bla',
    //sanitizeResources: false,
    //sanitizeOps: false,
    fn: async function() {
        let testee = new CloudCacheServer(null, '');
        testee.handler(null, async () => {
            throw new Error('');
        });
    }
});