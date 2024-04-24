/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */
const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const metroDefault = require('metro-config/src/defaults/defaults');

module.exports = {
  resolver: {
    blockList: exclusionList([
      // This stops "react-native run-windows" from causing the metro server to crash if its already running
      new RegExp(`${path.resolve(__dirname, 'windows').replace(/[/\\]/g, '/')}.*`),
      // This prevents "react-native run-windows" from hitting: EBUSY: resource busy or locked, open msbuild.ProjectImports.zip
      /.*\.ProjectImports\.zip/,
    ]),
    assetExts: metroDefault.assetExts.concat(['wasm']),
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  server: {
    rewriteRequestUrl: (url) => {
      if (!url.endsWith('.bundle')) {
        return url;
      }
      // https://github.com/facebook/react-native/issues/36794
      // JavaScriptCore strips query strings, so try to re-add them with a best guess.
      return url + '?platform=ios&dev=true&minify=false&modulesOnly=false&runModule=true';
    }, // ...
  }, // ...
};
