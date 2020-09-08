import * as yargs from 'yargs';
import { ClientService } from './ClientService'
import { RemoteController } from './RemoteController';
import { RemoteControllerConfiguration } from './RemoteControllerConfiguration';
import { LogInit } from './Logger';

const argv = yargs/*
    .parserConfiguration({
        'duplicate-arguments-array': false
    })*/
    .scriptName('mdath')
    .usage('Usage: $0 [options]')
    .example('$0 --key=xxxxxxxx --port=443 --cache=https://cdn.mangadex.cache', 'Run MangaDex@Cloud using a configured domain for caching images')
    .example('$0 --key=xxxxxxxx --port=443 --cache=/var/lib/mangadex/cache --size=256', 'Run MangaDex@Cloud using a configured local directory for caching images')
    .epilog('https://www.npmjs.com/package/@mangadex/cloud')
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
        describe: 'The origin of the CDN or the path to a local directory which shall be used to cache the image requests. When no cache is provided, the images will be directly passed through from the MangaDex image server.',
        default: 'https://s2.mangadex.org',
        type: 'string',
        nargs: 1
    })
    .option('size', {
        alias: 's',
        describe: 'The size limit (in GB) that shall be assigned to the CDN or cached within the local directory. In case of using a CDN, the size limit only affects the server side number of assigned chapters (shards).',
        default: 512,
        type: 'number',
        nargs: 1
    })
    .option('loglevel', {
        alias: 'l',
        describe: 'Log level (1: Error, 2: Warning, 3: Info, 4: Debug)',
        default: 2,
        type: 'number',
        nargs: 1
    })
    .argv;

argv.size = argv.size * 1073741824;
LogInit(argv.loglevel);

async function onInterrupt(callback: () => Promise<void>, timeout: number) {
    console.log(); // add newline after CTRL + C in terminal
    console.log(`Stopping application within the next ${(timeout/1000).toFixed(1)} seconds ...`);
    setTimeout(() => {
        console.warn('Application was stopped forcefully!');
        process.exit(1);
    }, timeout).unref();
    await callback();
    process.exit();
}

(async function main() {
    const configuration = new RemoteControllerConfiguration(argv.key, argv.port, argv.size, 0);
    const client = new ClientService(new RemoteController(configuration));
    process.on('SIGINT', () => onInterrupt(async () => client.stop(25000), 30000));
    await client.start(argv.cache, argv.size);
}());