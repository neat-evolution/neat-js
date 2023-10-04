require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  extends: ['@heygrady/eslint-config/ts-node-esm'],
  rules: {
    'import/export': 'off',
    'import/namespace': 'off',
  },
}
