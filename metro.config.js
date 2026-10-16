const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ajustar campos principales para preferir módulos de React Native
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Ajustar las condiciones de exportación de paquetes (ESM/CJS)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config;