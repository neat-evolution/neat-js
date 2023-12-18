# @neat-evolution/executor

Creates executable networks from the phenotype. Used internally for training networks. Useful for execute pre-trained networks.

```sh
yarn add @neat-evolution/executor
```

## Example

Each flavor of the NEAT algorithm will export a `createPhenotype` that can convert a genome, which is algorithm specific, into an algorithm agnostic phenotype.

1. Convert your genome into a phenotype
2. Wrap your phenotype with an executor
3. Make predictions

```ts
import { createPhenotype } from '@neat-evolution/neat'

import { createExecutor } from '@neat-evolution/executor'

// presuming you have evolved a neat population
const genome = population.best()

// 1. Convert your genome into a phenotype
const phenotype = createPhenotype(genome)

// 2. Wrap your phenotype with an executor
const executor = createExecutor(phenotype, 1)

// 3. Make predictions
const input = [1, 2, 3, 4]
const output = executor([input])
```
