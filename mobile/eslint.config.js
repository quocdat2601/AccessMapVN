const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['.expo/**', 'dist/**', 'node_modules/**'],
    rules: {
      // React Native Animated values are intentionally created in refs and consumed by style
      // objects. The generic web-oriented rule treats that supported RN pattern as a render read.
      'react-hooks/refs': 'off',
      // Loading state is synchronized with async native/API effects throughout the app.
      'react-hooks/set-state-in-effect': 'off',
      // React Native Text does not require HTML entity escaping.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
