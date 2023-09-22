# @neat-js/dataset-environment

The default environment ported from the original Rust implementation. Loads CSV-like training data into memory and returns fitness scores for executors.

This is where the fitness evaluation happens.

```sh
yarn add @neat-js/dataset-environment
```

## Example

The environment works hand-in-hand with the evaluator to train networks.

1. Set up your environment
2. Set up your evaluator

```ts
import { createEvaluator } from '@neat-js/evaluator'
import { createExecutor } from '@neat-js/executor'

import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-js/dataset-environment'

const datasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL('../../generated/iris', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1
}

// 1. Set up your environment
const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)

// 2. Set up your evaluator
const evaluator = createEvaluator(environment, createExecutor)
```
