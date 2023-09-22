# neat-js

NEAT-JS is a TypeScript port of the Rust reference implementation of [DES-HyperNEAT](https://github.com/tenstad/des-hyperneat/tree/master). You can read the original [DES-HyperNEAT paper](https://ntnuopen.ntnu.no/ntnu-xmlui/bitstream/handle/11250/2739318/Tenstad,%20Amund.pdf) for more information on NEAT and DES-HyperNEAT.

The Rust reference implementation is interesting because it implements NEAT, HyperNEAT, ES-HyperNEAT and DES-HyperNEAT on a common framework.

Porting NEAT from Rust to TypeScript is interesting because it enables evolving and executing neural networks directly in the browser or in Node.

If you are trying to run NEAT in a more traditional machine learning environment, check out [Python-NEAT](https://neat-python.readthedocs.io/en/latest/) and [PyTorch-NEAT](https://github.com/uber-research/PyTorch-NEAT).

## Getting started

Install NEAT-JS

```sh
yarn add @neat-js/neat
```

## Example

Evolve a neural network.

```ts
import { defaultNEATConfigOptions } from '@neat-js/core'
import { defaultDatasetOptions, DatasetEnvironment, loadDataset } from '@neat-js/dataset-environment'
import { AsyncEvaluator } from '@neat-js/evaluator'
import { defaultEvolutionOptions, defaultPopulationOptions } from '@neat-js/evolution'
import { createExecutor } from '@neat-js/executor'
import { createConfig, neat, defaultNEATGenomeOptions } from '@neat-js/neat'

const datasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL('../../generated/iris', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1,
}

const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)
const evaluator = new AsyncEvaluator(environment, createExecutor)

const evolutionOptions = {
  ...defaultEvolutionOptions,
  secondsLimit: 60,
  iterations: 500
}

const configProvider = createConfig(defaultNEATConfigOptions)
const populationOptions = defaultPopulationOptions
const genomeOptions = defaultNEATGenomeOptions

// Evolves the network and returns the best genome
const genome = await neat(
  evaluator,
  evolutionOptions,
  configProvider,
  populationOptions,
  genomeOptions
)
console.log(genome.toJSON())
```
