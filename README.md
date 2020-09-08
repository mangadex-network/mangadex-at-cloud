# MangaDex@Cloud

This is a NodeJS based reference implementation of the MangaDex@Home client.
In additon to caching images on a local drive (as the official client does), this client additionally offers the option to use a cloud CDN (e.g. CloudFlare).
With this option the client does not need a large and fast hard drive, but requires higher bandwidth to deal with the incoming requests when fetching the images from the CDN.

This client is very convenient in combination with some cheap VPS providers such as Hetzner that are offering instances with very low disk space, but decent monthly bandwith quota (some providers even exclude the incoming data from the quota).

----

## Cloud CDN

In order to use this client for cloud caching instead of local caching, a CDN such as CloudFlare is required.
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

To start the application the user needs to provide a valid client key, a port for communication and the URL to the CDN (which needs to be setup separately, e.g. CloudFlare) or a local directory for caching images via commandline args.

```bash
# cloud caching
mdath --key=xxxxxxxx --port=443 --cache=https://cdn.mangadex.cache
# local caching
mdath --key=xxxxxxxx --port=44300 --cache=/var/lib/mangadex/cache --size=256
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

### Debug

It is possible to run the application locally without connecting to the MangaDex control server.
In this mode requests can be made via CURL, or automated with any tool of the developers choice.
A remote debugger such as VS Code or Chrome may be attached to the spawned process.

```bash
npm run serve
```

Sample Query with CURL:
```bash
curl --insecure -H 'Host: localhost.mangadex.network' 'https://localhost:44300/data/46674605f17f6e5c77f6a094bf1adfd1/x2.jpg' -D /dev/stdout -o /tmp/image.jpg
```

**TIP:** Consider that request validations for e.g. `Referer` or `Token` are still in place and can be tested as well