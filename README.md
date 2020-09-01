# MangaDex@Cloud

This is a NodeJS based reference implementation of the MangaDex@Home client.
Instead of using a local disk for caching (as the official client does), this variant allows the usage of a cloud CDN (e.g. CloudFlare).
As a result this client does not need a large and fast hard drive, but in exchange it requires higher bandwidth for all the outgoing requests to fetch the images from the CDN.

----

## Cloud CDN

In order to use this client, a cloud CDN such as CloudFlare is required.
It is possible to use the official image servers directly, but this would obviously defeat the purpose of caching at all.
The basic idea is to setup a domain such as **cdn.mangadex-network.cf** and configure it for any cloud CDN provider as CNAME for **s2.mangadex.org** or **s5.mangadex.org**.

**TIP:** At the time of writing, free domains are available at [freenom](https://www.freenom.com)

----

## Runtime

To join the **MangaDex@Home** network, you need to be a registered user with a [Client Key](https://mangadex.org/md_at_home/request) to operate a **MangaDex@Home** client.
To run the application you need to install the following additional software:

- [node + npm](https://nodejs.org/en/download/)

### Installation

Install the application globally via NPM by running the command:
```bash
sudo npm install -g @mangadex/cloud
```

### Updating

If the application is already installed, it can be simply updated via NPM by running the command:
```bash
sudo npm update -g @mangadex/cloud
```

### Running

To start the application the user needs to provide a valid client key, a port for communication and the URL to the CDN (which needs to be setup separately, e.g. CloudFlare) via commandline args.

```bash
mdath --key=xxxxxxxx --port=44300 --cache=https://cdn.mangadex-network.cf --size=512
```
**TIP:** Use the `--help` option to show all commandline arguments

----

## Development

To start development you need to install the following additional software:

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [node + npm](https://nodejs.org/en/download/)

Clone Repository:
```bash
git clone 'https://github.com/mangadex-network/mangadex-at-cloud'
```