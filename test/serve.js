const fs = require('fs-extra');
const { ClientService } = require('../dist/ClientService.js');
const { RemoteController } = require('../dist/RemoteController.js');
const { RemoteControllerConfiguration } = require('../dist/RemoteControllerConfiguration.js');
const { LogInit } = require('../dist/Logger.js');

LogInit(4);

const cache = {
    size: 64 * 1024 * 1024,
    //location: ''
    location: './test/cache'
    //location: 'https://s5.mangadex.cf'
};

const configurationMock = new RemoteControllerConfiguration(null, 44300, cache.size, 0);
configurationMock._tlsCert = fs.readFileSync('./test/localhost.crt').toString('utf8');
configurationMock._tlsKey = fs.readFileSync('./test/localhost.key').toString('utf8');
configurationMock._imageServer = 'https://s5.mangadex.org';

const rpcMock = new RemoteController(configurationMock);
rpcMock.connect = () => Promise.resolve(configurationMock.clientOptions);
rpcMock.ping = () => Promise.resolve(configurationMock.clientOptions);
rpcMock.disconnect = () => Promise.resolve({});

(async function main() {
    const client = new ClientService(rpcMock);
    await client.start(cache.location, cache.size);
}());

// curl --insecure -H 'Host: localhost.mangadex.network' 'https://localhost:44300/data/46674605f17f6e5c77f6a094bf1adfd1/x2.jpg' -D /dev/stdout -o ~/Desktop/image.jpg