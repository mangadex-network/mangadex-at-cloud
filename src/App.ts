import * as yargs from 'yargs';
import { ClientService } from './ClientService'
import { RemoteController } from './RemoteController';
import { RemoteControllerConfiguration } from './RemoteControllerConfiguration';
import { LogInit, LogLevel } from './Logger';

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
    .option('ip', {
        alias: 'i',
        describe: 'The IP address reported to the mangadex control server to assign a .mangadex.network subdomain and forward image requests from the website. When no IP address is provided, the mangadex control server will use the client\'s public determined IP address.',
        default: '',
        type: 'string',
        nargs: 1
    })
    .option('port', {
        alias: 'p',
        describe: 'The port on which the client will listen to incoming requests and serve the cached images. The port will also be reported to the mangadex control server to correctly forward image requests from the website.',
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
    .option('throttle', {
        alias: 't',
        describe: 'The upload speed limit (in Mbit/s) of the client that shall be reported to the mangadex control server. When no upload speed limit is provided, the max. available bandwidth will be used.',
        default: 0,
        type: 'number',
        nargs: 1
    })
    .option('loglevel', {
        alias: 'l',
        describe: 'Log level (error | warn | info | debug)',
        default: 'warn',
        type: 'string',
        nargs: 1
    })
    .argv;

argv.size = argv.size * 1024 * 1024 * 1024;
argv.throttle = argv.throttle * 1024 * 1024 / 8;
LogInit({
    error: LogLevel.Error,
    warn: LogLevel.Warning,
    info: LogLevel.Info,
    debug: LogLevel.Debug
}[argv.loglevel]);

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
    const configuration = new RemoteControllerConfiguration(argv.key, argv.ip, argv.port, argv.size, argv.throttle);
    const client = new ClientService(new RemoteController(configuration));
    process.on('SIGINT', () => onInterrupt(async () => client.stop(25000), 30000));
    await client.start(argv.cache, argv.size);
}());