# MangaDex@Cloud

**⚡ [The fastest MangaDex@Home client available](#Synthetic-Benchmarks) ⚡**

This is a NodeJS based reference implementation of the MangaDex@Home client.
In additon to caching images on a local drive (as the official client does), this client also offers the ability to use a cloud CDN (e.g. CloudFlare).
With this option the client does not need a large and fast hard drive, but requires higher bandwidth to deal with the incoming requests when fetching the images from the CDN.

This client is very convenient in combination with some cheap VPS providers such as Hetzner that are offering instances with very low disk space, but decent monthly bandwith quota (some providers even exclude the incoming data from the quota).

[![](https://img.shields.io/npm/dm/@mangadex/cloud?color=informational&label=Downloads&logo=npm)](https://www.npmjs.com/package/@mangadex/cloud)
[![](https://github.com/mangadex-network/mangadex-at-cloud/workflows/Continuous%20Integration/badge.svg?branch=node&event=push)](https://github.com/mangadex-network/mangadex-at-cloud/actions?query=workflow%3A%22Continuous+Integration%22+branch%3Anode)
[![](https://github.com/mangadex-network/mangadex-at-cloud/workflows/Continuous%20Delivery/badge.svg?branch=node&event=workflow_dispatch)](https://github.com/mangadex-network/mangadex-at-cloud/actions?query=workflow%3A%22Continuous+Delivery%22+branch%3Anode)

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

## Synthetic Benchmarks

To access the performance and compare the application with other implementations, a synthetic benchmark was performed on the following cloud VPS:

| System   |         |
| -------- | ------- |
| Provider | Hetzner |
| Plan     | CPX41   |
| vCPU     | 8x      |
| RAM      | 16 GB   |

As benchmark tool, siege was used with the following command and either 30 or 200 concurrent connections:

`siege -c 30 -b -t 30s -H 'Host: localhost.mangadex.network' https://localhost:44300/data/8172a46adc798f4f4ace6663322a383e/B19.png`

### Results in Non-Cluster Mode (Single Instance)
`npm run serve`
```bash
** SIEGE 4.0.4
** Preparing 30 concurrent users for battle.
The server is now under siege...
Lifting the server siege...
Transactions:                8392 hits
Availability:              100.00 %
Elapsed time:               29.47 secs
Data transferred:         5480.17 MB
Response time:               0.10 secs
Transaction rate:          284.76 trans/sec
Throughput:                185.96 MB/sec
Concurrency:                29.56
Successful transactions:     8392
Failed transactions:            0
Longest transaction:         1.42
Shortest transaction:        0.03

** SIEGE 4.0.4
** Preparing 200 concurrent users for battle.
The server is now under siege...
Lifting the server siege...
Transactions:                8501 hits
Availability:              100.00 %
Elapsed time:               29.61 secs
Data transferred:         5577.65 MB
Response time:               0.65 secs
Transaction rate:          287.10 trans/sec
Throughput:                188.37 MB/sec
Concurrency:               185.86
Successful transactions:     8502
Failed transactions:            0
Longest transaction:         1.98
Shortest transaction:        0.32
```

### Results in Cluster Mode (8 Workers)
`npm run cluster`
```bash
** SIEGE 4.0.4
** Preparing 30 concurrent users for battle.
The server is now under siege...
Lifting the server siege...
Transactions:               35292 hits
Availability:              100.00 %
Elapsed time:               29.60 secs
Data transferred:        23152.97 MB
Response time:               0.02 secs
Transaction rate:         1192.30 trans/sec
Throughput:                782.19 MB/sec
Concurrency:                29.33
Successful transactions:    35292
Failed transactions:            0
Longest transaction:         0.15
Shortest transaction:        0.00

** SIEGE 4.0.4
** Preparing 200 concurrent users for battle.
The server is now under siege...
Lifting the server siege...
Transactions:               39536 hits
Availability:              100.00 %
Elapsed time:               29.78 secs
Data transferred:        25940.48 MB
Response time:               0.15 secs
Transaction rate:         1327.60 trans/sec
Throughput:                871.07 MB/sec
Concurrency:               195.48
Successful transactions:    39541
Failed transactions:            0
Longest transaction:         0.76
Shortest transaction:        0.00
```

## Live Performance

The following screenshots provide some sample footage from an instance running on the mangadex network

### MangaDex@Home Configuration
![](https://i.imgur.com/vyfSpIM.png)

### VPS Plan
![](https://i.imgur.com/gFqSSq9.png)

### VPS Statistics
![](https://i.imgur.com/G1sHUAb.png)

### MangaDex Network Statistics
![](https://i.imgur.com/PjV5pUw.png)

### Cloud CDN Statistics
![](https://i.imgur.com/87PvmcH.png)
