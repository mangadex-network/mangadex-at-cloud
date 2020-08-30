// parse commandline args
import yargs from 'https://deno.land/x/yargs/deno.ts';
import { ClientService } from './ClientService.ts'
import { RemoteController } from './RemoteController.ts';
import { RemoteControllerConfiguration } from './RemoteControllerConfiguration.ts';

const argv: any = yargs(Deno.args)/*
    .parserConfiguration({
        'duplicate-arguments-array': false
    })*/
    .scriptName('mdath')
    .usage('Usage: $0 [options]')
    .example('$0 --key=xxxxxxxx --port=443 --cache=https://cdn.my-mangadex.domain', '')
    .epilog('https://github.com/mangadex-network/mangadex-at-cloud')
    .help()
    .option('key', {
        alias: 'k',
        describe: 'The client key required to join the MangaDex@Home network.',
        demand: true,
        type: 'string',
        nargs: 1
    })
    .option('port', {
        alias: 'p',
        describe: 'The port on which the client will listen to incoming requests and serve the cached images.',
        default: 443,
        type: 'number',
        nargs: 1
    })
    .option('cache', {
        alias: 'c',
        describe: 'The origin of the CDN which is used to cache image requests. When no CDN is provided, the images will not be cached.',
        default: 'https://s2.mangadex.org',
        type: 'string',
        nargs: 1
    })
    .option('size', {
        alias: 's',
        describe: 'The size limit (in GB) that shall be cached by the CDN. The assignment of images is handled by the MangaDex network.',
        default: 512,
        type: 'number',
        nargs: 1
    })/*
    .option('data-saver', {
        alias: 's',
        describe: 'Enforces the MangaDex data-saver mode for all image requests. When set, only optimized images will be fetched from the CDN.',
        default: false,
        type: 'boolean',
        nargs: 0
    })*/
    .option('loglevel', {
        alias: 'l',
        describe: 'Log level (2: Error, 3: Warning, 4: Info, 6: Debug)',
        default: 4,
        type: 'number',
        nargs: 1
    })
    .argv;

async function sigint(client: ClientService) {
    const sig = Deno.signal(Deno.Signal.SIGINT);
    await sig;
    sig.dispose();
    console.log();
    console.log('Stopping service ...');
    const timeout = setTimeout(() => {
        console.warn('Sopped forcefully');
        Deno.exit();
    }, 30000);
    await client.stop(25000);
    clearTimeout(timeout);
    console.log('Stopped gracefully');
}

(async function main() {
    //Deno.signal => Deno.exit();
    const configuration = new RemoteControllerConfiguration(argv.key, argv.port, argv.shard * 1073741824, 0);
    const client = new ClientService(new RemoteController(configuration));
    sigint(client);
    await client.start(argv.cache);
}());