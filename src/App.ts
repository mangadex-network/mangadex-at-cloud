// parse commandline args
//import { yargs } from 'deps.ts'
import { ClientService } from './ClientService.ts'
import { RemoteController } from './RemoteController.ts';
import { RemoteControllerConfiguration } from './RemoteControllerConfiguration.ts';

/*
yargs()
    .option('port', {
        alias: 'p',
        describe: 'The port on which the client will listen to incoming requests and serve the cached images.',
        default: 44300,
        type: 'number',
        nargs: 1
    })
    .help()
    //.strictCommands()
    //.demandCommand(1)
    .parse(Deno.args);
*/

const configuration = new RemoteControllerConfiguration('xxxxxxxx', 44300, 8 * 1024 * 1024 * 1024 * 1024, 0);
const rpc = new RemoteController(configuration);
const client = new ClientService(rpc);
await client.start('https://s5.mangadex.cf');

//Deno.signal