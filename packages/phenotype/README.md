# @neat-js/phenotype

Types and helper functions for working with Phenotypes. In the NEAT ecosystem, a Phenotype is the ready-to-execute version of a genome. All of the various flavors of the NEAT algorithm export the exact same phenotype format.

Phenotypes are the data that is passed to an executor, which itself returns a function that will make predictions.

```sh
yarn add @neat-js/phenotype
```

## Example

You would almost never use @neat-js/phenotype directly. Each flavor of the NEAT algorithm will export a `createPhenotype` that can convert a genome, which is algorithm specific, into an algorithm agnostic phenotype.

```ts
import { createExecutor } from '@neat-js/executor'
import { createPhenotype } from '@neat-js/neat'

// presuming you have evolved a neat population
const genome = population.best()

// create an executor from the genome
const phenotype = createPhenotype(genome)
const executor = createExecutor(phenotype, 1)

// make predictions
const input = [1, 2, 3, 4]
const output = executor([input])
```
