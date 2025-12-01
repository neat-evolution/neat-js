import config from '@heygrady/eslint-config/ts-node-esm.js'
import globals from 'globals'

export default [
  ...config,
  {
    ignores: ['.turbo/', 'dist/', 'coverage/', 'node_modules/'],
  },
  // Browser-specific files need browser globals and relaxed Node rules
  {
    files: ['src/browser/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Browser APIs are not available in Node - disable Node-specific checks
      'n/no-unsupported-features/node-builtins': 'off',
    },
  },
]
