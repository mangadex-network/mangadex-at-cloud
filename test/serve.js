const fs = require('fs-extra');
const { ClientService } = require('../dist/ClientService.js');
const { RemoteController } = require('../dist/RemoteController.js');
const { RemoteControllerConfiguration } = require('../dist/RemoteControllerConfiguration.js');
const { LogInit } = require('../dist/Logger.js');

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

(async function main() {
    const configMock = new RemoteControllerConfigurationMock();
    const remoteMock = new RemoteControllerMock(configMock);
    const client = new ClientService(remoteMock);
    await client.start(cache.location, cache.size);
}());

// curl --insecure -H 'Host: localhost.mangadex.network' 'https://localhost:44300/data/46674605f17f6e5c77f6a094bf1adfd1/x2.jpg' -D /dev/stdout -o ~/Desktop/image.jpg