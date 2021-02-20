import * as yargs from 'yargs';
import * as cluster from 'cluster';
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
    .example('$0 --key=xxxxxxxx --port=443 --cache=/var/lib/mangadex/cache --size=256', 'Run MangaDex@Cloud using a local directory for caching images')
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
    .option('workers', {
        alias: 'w',
        describe: 'The number of worker processes that should be spawned to handle requests and serve content from the cache. When using 0, a process will be spawned automatically for each CPU.',
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

argv.size = argv.size * 1073741824;
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

// TODO: run as cluster with workers ...
(async function main() {
    const clients = [];
    const configuration = new RemoteControllerConfiguration(argv.key, argv.port, argv.size, 0);
    const remote = new RemoteController(configuration);

    if(cluster.isMaster) {
        const options = await remote.connect();
    
        // stop all workers when receiving SIGINT
        process.on('SIGINT', () => onInterrupt(async () => {
            clearInterval(heartbeat);
            workers.send('stop', 25000);
        }, 30000));
    
        // update all workers when SSL cert changed
        const heartbeat: NodeJS.Timeout = setInterval(async () => {
            try {
                const options = await remote.ping();
                workers.send('update', options);
                // TODO: update certificate when changed ...
                //this._service.setSecureContext(options);
                //console.info('Updated client SSL certificate');
            } catch(error) {
                console.warn('An unexpected Error occured during Configuration Update:', error);
            }
        }, 60000);
    
        // start all workers ...
        worker.send('start', argv.cache, argv.size, options);
        console.log('');
    }
    //if(cluster.isWorker || argv.workers < 2) {
        const client = new ClientService(remote);
        // wire up events to start/update/stop client with worker process messaging
    //}

    for(let i = 0; i < argv.workers; i++) {
        const worker = cluster.fork();
        worker.on(...);
        // kill worker in 5~10 days to start a fresh one ...
    }
}());