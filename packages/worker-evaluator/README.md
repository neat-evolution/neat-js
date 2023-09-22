# @neat-js/worker-evaluator

Evaluates Genomes in a worker. Works in the browser using Web Workers and in Node using Worker Threads. This is a drop-in replacement for `AsyncEvaluator` and is a significant performance boost in mot real-world settings.

```sh
yarn add @neat-js/worker-evaluator
```

# Example

This is a kitchen sink example adapted from the demo.

The import parts:
1. Look up the number of CPUs in your environment
2. Provide packages or paths for createEnvironment and createExecutor
3. Create a worker evaluator

Everything else is the normal, required boilerplate.

```ts
import os from 'node:os'

import { defaultNEATConfigOptions } from '@neat-js/core'
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-js/dataset-environment'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
} from '@neat-js/evolution'
import { defaultNEATGenomeOptions, neat } from '@neat-js/neat'

import { createEvaluator } from '@neat-js/worker-evaluator'

const datasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL('../../generated/iris', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1
}

const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)

// 1. Look up the number of CPUs in your environment
// Node
const workerThreadLimit = os.cpus().length - 1 

// Browser
// const workerThreadLimit = window.navigator.hardwareConcurrency 

// 2. Provide packages for createEnvironment and createExecutor
const evaluatorOptions = {
    createEnvironmentPathname: '@neat-js/dataset-environment',
    createExecutorPathname: '@neat-js/executor',
    taskCount: defaultPopulationOptions.populationSize,
    threadCount: workerThreadLimit,
  }

// 3. Create a worker evaluator
const evaluator = createEvaluator(environment, evaluatorOptions)

const evolutionOptions: EvolutionOptions = {
  ...defaultEvolutionOptions,
  iterations: 500,
  secondsLimit: 60,
}

const genome = await neat(
  evaluator,
  evolutionOptions,
  defaultNEATConfigOptions,
  defaultPopulationOptions,
  defaultNEATGenomeOptions
)
```


