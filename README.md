# MangaDex@Cloud

This is a Deno based reference implementation of the MangaDex@Home client.
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

- [deno](https://deno.land/#installation)

### Run Online

The application can be directly launched from the repositiory.
The related packages will be downloaded into deno's cache.
```bash
deno run --allow-net --allow-read --allow-write --unstable 'https://raw.githubusercontent.com/mangadex-network/mangadex-at-cloud/deno/src/App.ts' --key=xxxxxxxx --port=44300 --cache=https://cdn.mangadex-network.cf --size=512
```
**TIP:** The `/deno/` part in the url may be extended by a specific [version tag](https://github.com/mangadex-network/mangadex-at-cloud/tags), e.g. `/deno/v1.2.2-alpha.1/`

### Run Locally

For convenience the application can be downloaded and wrapped into a named shell script.
```bash
deno install --allow-net --allow-read --allow-write --unstable --name mdath 'https://raw.githubusercontent.com/mangadex-network/mangadex-at-cloud/deno/src/App.ts'
```
**TIP:** The `/deno/` part in the url may be extended by a specific [version tag](https://github.com/mangadex-network/mangadex-at-cloud/tags), e.g. `/deno/v1.2.2-alpha.1/`

You may optionally add the deno directory to the environment path or create a symlink
```bash
ln -s /home/user/.deno/bin/mdath /usl/local/bin/mdath
```

To run the application use the name of the shell script

```bash
mdath --key=xxxxxxxx --port=44300 --cache=https://cdn.mangadex-network.cf --size=512
```
**TIP:** Use the `--help` option to show all commandline arguments

----

## Development

To start development you need to install the following additional software:

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [deno](https://deno.land/#installation)

Clone Repository:
```bash
git clone 'https://github.com/mangadex-network/mangadex-at-cloud'
```

Run:
```bash
cd mangadex-at-cloud
deno run --allow-all --unstable './src/App.ts' --key=xxxxxxxx --port=44300 --cache=https://cdn.mangadex-network.cf --size=512
```

Bundle:
```bash
deno bundle './src/App.ts' [options ... ?]
```