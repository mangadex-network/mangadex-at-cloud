const fs = require('fs-extra');
const cluster = require('cluster');
//const cpus = require('os').cpus().length;
const { ClientService } = require('../dist/ClientService.js');
const { RemoteController } = require('../dist/RemoteController.js');
const { RemoteControllerConfiguration } = require('../dist/RemoteControllerConfiguration.js');
const { LogInit } = require('../dist/Logger.js');

const workers = 4; // cpus > 1 ? cpus - 1 : 1;
LogInit(4);

const cache = {
    size: 8 * 1024 * 1024 * 1024,
    //location: ''
    location: './test/cache'
    //location: 'https://s5.mangadex.cf'
};

class RemoteControllerConfigurationMock extends RemoteControllerConfiguration {
    constructor() {
        super(null, null, 44300, cache.size, 0, 0);
        super._tlsCert = fs.readFileSync('./test/localhost.crt').toString('utf8');
        super._tlsKey = fs.readFileSync('./test/localhost.key').toString('utf8');
        super._imageServer = 'https://s5.mangadex.org';
    }
}

class RemoteControllerMock extends RemoteController {
    constructor(configuration) {
        super(configuration);
    }
    async _ping() {
        return Promise.resolve();
    }
    async connect() {
        console.log(this._configuration.clientOptions);
        return Promise.resolve(this._configuration.clientOptions);
    }
    async disconnect() {
        return Promise.resolve();
    }
}

if(cluster.isMaster) {
    console.log(`Using ${workers} for this machine`);
    for (let i = 0; i < workers; i++) {
        cluster.fork();
    }

    cluster.on('online', worker => {
        console.log(`Worker ${worker.process.pid} is online`);
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died with code: ${code} and signal: ${signal}`);
        console.log('Starting a new worker...');
        cluster.fork();
    });
} else {
    const configMock = new RemoteControllerConfigurationMock();
    const remoteMock = new RemoteControllerMock(configMock);
    const client = new ClientService(remoteMock);
    client.start(cache.location, cache.size);
}

// curl --insecure -H 'Host: localhost.mangadex.network' 'https://localhost:44300/data/46674605f17f6e5c77f6a094bf1adfd1/x2.jpg' -D /dev/stdout -o ~/Desktop/image.jpg