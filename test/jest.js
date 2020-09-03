module.exports = {
    rootDir: '../src',
    testRegex: '.*\_(test|spec|e2e)\.ts$',
    displayName: 'All Tests',
    preset: 'ts-jest',
    testEnvironment: 'node',
    reporters: [
        'default',
        'jest-junit'
    ]
};