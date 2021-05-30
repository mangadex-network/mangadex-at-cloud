const fs = require('fs-extra');
const { ClientService } = require('../dist/ClientService.js');
const { RemoteController } = require('../dist/RemoteController.js');
const { RemoteControllerConfiguration } = require('../dist/RemoteControllerConfiguration.js');
const { LogInit } = require('../dist/Logger.js');

LogInit(4);

const cache = {
    size: 8 * 1024 * 1024 * 1024,
    location: './test/cache'
};

class RemoteControllerConfigurationMock extends RemoteControllerConfiguration {
    constructor() {
        super(null, null, 44300, cache.size, 0, 0);
        super._tlsCert = fs.readFileSync('./test/localhost.crt').toString('utf8');
        super._tlsKey = fs.readFileSync('./test/localhost.key').toString('utf8');
        super._imageServer = 'https://s2.mangadex.org'; // 'https://reh3tgm2rs8sr.xnvda7fch4zhr.mangadex.network';
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
    verifyToken(chapter, token) {
        return true;
    }
}

(async function main() {
    const configMock = new RemoteControllerConfigurationMock();
    const remoteMock = new RemoteControllerMock(configMock);
    const client = new ClientService(remoteMock);
    await client.start(cache.location, cache.size);
}());

// curl --insecure -H 'Host: localhost.mangadex.network' 'https://localhost:44300/data/8172a46adc798f4f4ace6663322a383e/B18-8ceda4f88ddf0b2474b1017b6a3c822ea60d61e454f7e99e34af2cf2c9037b84.png' -D /dev/stdout -o ~/Desktop/image.jpg