module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    sourceType: 'module',
    extraFileExtensions: ['.json'],
  },
  ignorePatterns: ['.eslintrc.js', '**/*.js', '**/node_modules/**', '**/dist/**'],
  plugins: ['eslint-plugin-n8n-nodes-base'],
  extends: ['plugin:eslint-plugin-n8n-nodes-base/community'],
  rules: {
    'n8n-nodes-base/node-param-description-missing-from-dynamic-options': 'warn',
  },
};
