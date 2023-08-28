# neat-js

NEAT-JS is a TypeScript port of the Rust reference implementation of [DES-HyperNEAT](https://github.com/tenstad/des-hyperneat/tree/master). You can read the original [DES-HyperNEAT paper](https://ntnuopen.ntnu.no/ntnu-xmlui/bitstream/handle/11250/2739318/Tenstad,%20Amund.pdf) for more information on NEAT and DES-HyperNEAT.

The Rust reference implementation is interesting because it implements NEAT, HyperNEAT, ES-HyperNEAT and DES-HyperNEAT on a common framework.

Porting NEAT from Rust to TypeScript is interesting because it enables evolving and executing neural networks directly in the browser.

If you are trying to run NEAT in a more traditional machine learning environment, check out [Python-NEAT](https://neat-python.readthedocs.io/en/latest/) and [PyTorch-NEAT](https://github.com/uber-research/PyTorch-NEAT).

## Getting started

Install NEAT-JS

```sh
yarn add @neat-js/neat
```

Evolve a neural network.

```ts
import { defaultNEATConfigOptions } from '@neat-js/core/NEATOptions.js'
import { defaultDatasetConfig } from '@neat-js/dataset-environment/DatasetConfig.js'
import { DatasetEnvironment } from '@neat-js/dataset-environment/DatasetEnvironment.js'
import { loadDataset } from '@neat-js/dataset-environment/loadDataset.js'
import { AsyncEvaluator } from '@neat-js/evaluator/AsyncEvaluator.js'
import { defaultEvolutionOptions } from '@neat-js/evolution/EvolutionOptions.js'
import { defaultPopulationOptions } from '@neat-js/evolution/PopulationOptions.js'
import { createExecutor } from '@neat-js/executor/createExecutor.js'
import { createConfig } from '@neat-js/neat/createConfig.js'
import { neat } from '@neat-js/neat/index.js'
import { defaultNEATGenomeOptions } from '@neat-js/neat/NEATGenomeOptions.js'

const datasetOptions = {
  ...defaultDatasetConfig,
  dataset: new URL('../../generated/wine', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1,
}

const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)
const evaluator = new AsyncEvaluator(environment, createExecutor)

const evolutionOptions = {
  ...defaultEvolutionOptions,
  secondsLimit: 600,
}

const configProvider = createConfig(defaultNEATConfigOptions)
const populationOptions = defaultPopulationOptions
const genomeOptions = defaultNEATGenomeOptions

const genome = await neat(
  evaluator,
  evolutionOptions,
  configProvider,
  populationOptions,
  genomeOptions
)
console.log(genome?.toJSON())
```
