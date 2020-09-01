const fs = require('fs-extra');

async function bump(file) {
    let config = await fs.readJSON(file);
    console.log('Version Found:', config.version);
    let version = config.version.split('.');
    version[3] = parseInt(version[3]) + 1;
    config.version = version.join('.');
    console.log('Version Bumped:', config.version);
    await fs.writeJSON(file, config, { spaces: 2 });
}

bump('./package.json');
bump('./package-lock.json');

// TODO: Commit updated package.json to GitHub repository!