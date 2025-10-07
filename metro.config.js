// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// habilitamos .sql como asset
config.resolver.assetExts.push('sql');

module.exports = config;