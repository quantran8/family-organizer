module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Phải đứng CUỐI. react-native-worklets/plugin thay cho
      // react-native-reanimated/plugin từ Reanimated 4.
      'react-native-worklets/plugin',
    ],
  };
};
