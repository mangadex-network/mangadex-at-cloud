import { assert, assertEquals, assertArrayContains } from 'https://deno.land/std/testing/asserts.ts';

Deno.test({
    name: 'App.FooBar() - Should bla bla bla',
    //sanitizeResources: false,
    //sanitizeOps: false,
    fn: async function() {
        let testee = [ 1, 2, 3 ];
        testee.push(4);
        assertArrayContains(testee, [ 1, 2, 3, 4 ]);
        //console.log('OK');
    }
});