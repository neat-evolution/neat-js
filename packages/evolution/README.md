# @neat-evolution/evolution

All of the logic for evolving a population of organisms and organizing them into species. This is the core of the NEAT algorithm and is shared by all flavors. Typically this is wrapped up in an algorithm-specific helper function so that all of the algorithm-specific configuration is handled for you.

```sh
yarn add @neat-evolution/evolution
```

## Example

Normally you would not use this directly. Here's some code pulled from the `neat` function and combined with the standard boilerplate.

Managing the evolution process in this way gives you some additional abilities to manipulate the population or even export it to JSON.

1. Typical boilerplate
2. Internals of the `neat` function
3. Additional capabilities

```ts
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import { createEvaluator } from '@neat-evolution/evaluator'
import { createExecutor } from '@neat-evolution/executor'
import {
  defaultNEATGenomeOptions,
  NEATAlgorithm,
  type NEATGenomeOptions,
  type DefaultNEATGenome,
  type DefaultNEATGenomeData,
  type DefaultNEATGenomeFactoryOptions,
  type NEATConfig,
  type NEATLink,
  type NEATNode,
  type NEATState
} from '@neat-evolution/neat'

import {
  createReproducer,
  defaultEvolutionOptions,
  defaultPopulationOptions,
  evolve,
  Population,
  type EvolutionOptions
} from '@neat-evolution/evolution'


// 1. Typical boilerplate
const datasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL('../../generated/iris', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1
}

const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)

const evaluator = createEvaluator(environment, createExecutor)

// 2. Internals of the `neat` function
const evolutionOptions: EvolutionOptions = {
  ...defaultEvolutionOptions,
  iterations: 500,
  secondsLimit: 60,
}

const configProvider = NEATAlgorithm.createConfig(defaultNEATConfigOptions)
const mergedGenomeOptions = {
  ...defaultNEATGenomeOptions,
  ...evaluator.environment.description,
}

const population = new Population<
  NEATNode,
  NEATLink,
  NEATConfig,
  NEATState,
  NEATGenomeOptions,
  DefaultNEATGenomeFactoryOptions,
  DefaultNEATGenomeData,
  DefaultNEATGenome,
  typeof NEATAlgorithm,
  undefined
>(
  createReproducer,
  evaluator,
  NEATAlgorithm,
  configProvider,
  defaultPopulationOptions,
  undefined,
  mergedGenomeOptions
)

await evolve(population, evolutionOptions)

// 3. Additional capabilities
const genome = population.best()
const data = population.toJSON()
```
