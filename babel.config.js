// module.exports = {
//   presets: ['module:metro-react-native-babel-preset'],
//   plugins: ['react-native-reanimated/plugin'], // required by react-native-reanimated v2 https://docs.swmansion.com/react-native-reanimated/docs/installation/
// };

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        allowlist: ['MINI_AMOUNT'],
        blacklist: null,
        whitelist: null,
        safe: true,
        allowUndefined: true,
      },
    ],
    ['react-native-reanimated/plugin'], // required by react-native-reanimated v2 https://docs.swmansion.com/react-native-reanimated/docs/installation/
  ],
};
