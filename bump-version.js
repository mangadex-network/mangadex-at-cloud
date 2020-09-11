const fs = require('fs-extra');
const exec = require('child_process').exec;

async function bump(file) {
    let config = await fs.readJSON(file);
    console.log('Version Found:', config.version);
    let version = config.version.split('.');
    version[3] = parseInt(version[3]) + 1;
    config.version = version.join('.');
    console.log('Version Bumped:', config.version);
    await fs.writeJSON(file, config, { spaces: 2 });
    return config.version;
}

function execute(command, silent) {
    if(!silent) {
        console.log('>', command);
    }
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if(!silent) {
                console.log(stdout);
                console.log(stderr);
            }
            if(error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function gitCommit(branch, version) {
    let user = process.env.GITHUB_ACTOR;
    let mail = user + '@users.noreply.github.com';
    let auth = Buffer.from('x-access-token:' + process.env.GITHUB_TOKEN).toString('base64');
    await execute(`git add package*`);
    await execute(`git -c user.name="${user}" -c user.email="${mail}" commit -m 'Bump Version ${version} => Deploy'`);
    await execute(`git -c http.extraheader="AUTHORIZATION: Basic ${auth}" push origin HEAD:${branch}`);
}

(async function main() {
    const version = await bump('./package.json');
    await bump('./package-lock.json');

    if(process.env.GITHUB_ACTOR && process.env.GITHUB_TOKEN) {
        await gitCommit('node', version);
    } else {
        await execute(`git add package*`);
        await execute(`git commit -m 'Bump Version ${version}'`);
        await execute(`git push`);
    }
})();