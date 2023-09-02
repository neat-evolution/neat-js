export * from './createEvaluator.js'
export * from './WorkerEvaluator.js'
export * from './WorkerAction.js'

/*
  "main": "./dist/cjs/node/index.js",
  "module": "./dist/esm/node/index.js",
  "types": "./dist/types/node/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": {
        "node": "./dist/esm/node/index.js",
        "browser": "./dist/esm/browser/index.js",
        "default": "./dist/esm/node/index.js",
      },
      "require": {
        "node": "./dist/cjs/node/index.js",
        "browser": "./dist/cjs/browser/index.js",
        "default": "./dist/cjs/node/index.js",
      }
    },
    "./browser": {
      "types": "./dist/types/browser/index.d.ts",
      "import": "./dist/esm/browser/index.js",
      "require": "./dist/cjs/browser/index.js"
    },
    "./node": {
      "types": "./dist/types/node/index.d.ts",
      "import": "./dist/esm/node/index.js",
      "require": "./dist/cjs/node/index.js"
    }
  },
 */
