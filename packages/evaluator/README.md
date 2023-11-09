# @neat-evolution/evaluator

Types and helper functions for evaluating genomes in the environment. This is a critical part of the training loop and can be parallelized.

If you can utilize workers (web workers or node worker threads) then you will see some significant performance improvements by using `@neat-evolution/worker-evaluator` instead.

```sh
yarn add @neat-evolution/evaluator
```

## Example

The evaluator marries the environment (the data) with the executor (the neural network).

1. Set up your environment
2. Set up your evaluator
3. Evolve a network

```ts
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
} from '@neat-evolution/evolution'
import { createExecutor } from '@neat-evolution/executor'
import { defaultNEATGenomeOptions, neat } from '@neat-evolution/neat'

import { createEvaluator } from '@neat-evolution/evaluator'

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

const evolutionOptions: EvolutionOptions = {
  ...defaultEvolutionOptions,
  iterations: 500,
  secondsLimit: 60,
}

// 3. Evolve a network
const genome = await neat(
  evaluator,
  evolutionOptions,
  defaultNEATConfigOptions,
  defaultPopulationOptions,
  defaultNEATGenomeOptions
)
```
