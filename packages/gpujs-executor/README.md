# @neat-js/gpujs-executor

Experimental. This is *VERY* slow.

Executes the networks using [GPU.js](https://github.com/gpujs/gpu.js) to take advantage of the GPU. This should theoretically be fast with large enough batch sizes.

Should be a drop-in replacement for the vanilla executor.

```sh
yarn add @neat-js/gpujs-executor
```

# Example

This example is adapted from the kitchen-sink demo.

1. Import the gpujs-executor creator
2. Pass it to the evaluator

All of the other boilerplate should be the same. Below it show using the default evaluator but it will work with worker-evaluator as well.

```ts
import { defaultNEATConfigOptions } from '@neat-js/core'
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-js/dataset-environment'
import { createEvaluator } from '@neat-js/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
} from '@neat-js/evolution'
import { defaultNEATGenomeOptions, neat } from '@neat-js/neat'

// 1. Import the gpujs-executor creator
import { createExecutor } from '@neat-js/gpujs-executor'

const datasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL('../../generated/iris', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1
}

const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)

// 2. Pass it to the evaluator
const evaluator = createEvaluator(environment, createExecutor)

const evolutionOptions: EvolutionOptions = {
  ...defaultEvolutionOptions,
  iterations: 500,
  secondsLimit: 60,
}

await neat(
  evaluator,
  evolutionOptions,
  defaultNEATConfigOptions,
  defaultPopulationOptions,
  defaultNEATGenomeOptions
)
```
