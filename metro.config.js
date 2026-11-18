const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Keep release bundling within the memory available on small build servers.
config.maxWorkers = 1;

module.exports = config;
