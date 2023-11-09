# @neat-evolution/neat

Implementation of the NEAT algorithm.

```sh
yarn add @neat-evolution/neat
```

## Example

You still need a fair amount of boilerplate to set up the data environment, however all of the boilerplate for configuring your population to train with the NEAT algorithm is handled by the `neat` function.

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
import { createEvaluator } from '@neat-evolution/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
} from '@neat-evolution/evolution'
import { createExecutor } from '@neat-evolution/executor'

import { defaultNEATGenomeOptions, neat } from '@neat-evolution/neat'

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
