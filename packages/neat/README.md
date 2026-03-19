# @neat-evolution/neat

The `@neat-evolution/neat` package provides the core implementation of the
NeuroEvolution of Augmenting Topologies (NEAT) algorithm. It builds upon the
foundational components defined in `@neat-evolution/core` to offer a complete,
functional NEAT system capable of evolving neural network topologies, weights,
and per-node biases to solve various problems. It supports both pure
neuroevolution (default) and Lamarckian/backprop modes where trained weights and
biases are written back into genomes between generations.

## Purpose

The primary purpose of the `@neat-evolution/neat` package is to:

- **Implement the NEAT Algorithm:** Provide a faithful and robust implementation
  of the original NEAT algorithm, including its mechanisms for speciation,
  crossover, and mutation.
- **Support Per-Node Biases:** Every node stores a `bias` value (on `CoreNode`).
  Bias is included in crossover (averaged), genetic distance, and
  serialization. Bias mutation is controlled by genome options and disabled by
  default.
- **Enable Lamarckian Writeback:** `writeBackWeights` handles both link weight
  updates and node bias updates from `WritebackPayload`, allowing
  backprop-trained parameters to flow back into the genome.
- **Extend Core Functionality:** Specialize the generic `CoreGenome`,
  `CoreConfig`, and `CoreState` from `@neat-evolution/core` to fit the specific
  requirements of NEAT.
- **Serve as a Baseline:** Act as the standard NEAT implementation against which
  more advanced NEAT variants (like HyperNEAT) can be compared and built upon.

## How it Fits into the Ecosystem

The `neat` package is a central piece of the `neat-js` monorepo, directly
utilizing and extending several other packages:

- **`@neat-evolution/core`**: Provides the fundamental `Algorithm`,
  `CoreGenome`, `CoreConfig`, `CoreState`, `CoreNode`, and `Link` abstractions
  that `neat` specializes.

- **`@neat-evolution/evolution`**: The `neat` function orchestrates the
  evolutionary process by creating a population and calling the `evolve`
  function from this package.

- **`@neat-evolution/evaluator`**: Requires an `Evaluator` instance to assess
  the fitness of evolved NEAT genomes.

- **`@neat-evolution/executor`**: Provides `createTrainableExecutor()` for
  backprop-based lifetime learning. Phenotypes created by this package include
  the `trainableBiases` flag to control whether biases are trainable.

- **`@neat-evolution/utils`**: Leverages utility functions for random number
  generation and other common tasks.

## Installation

This package is hosted on [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry). You'll need to configure your package manager to use the GitHub Packages registry for the `@neat-evolution` scope.

### Yarn (v2+)

Add to your `.yarnrc.yml`:

```yaml
npmScopes:
  neat-evolution:
    npmAlwaysAuth: true
    npmRegistryServer: "https://npm.pkg.github.com"
```

Then install:

```sh
yarn add @neat-evolution/neat
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/neat
```

This package also requires several peer dependencies to function correctly.
Ensure you have installed the necessary `@neat-evolution` packages as described
in the main repository `README.md`.

## Key Components

The `neat` package exposes several important classes, interfaces, and functions:

- **`NEATAlgorithm`**: An object conforming to the `Algorithm` interface from
  `@neat-evolution/core`, encapsulating the factory functions for creating
  NEAT-specific configurations, genomes, phenotypes, and states. Includes
  `writeBackWeights` for Lamarckian writeback of both link weights and node
  biases.

- **`NEATConfig`**: Extends `CoreConfig` to provide NEAT-specific configuration
  options. It primarily wraps the `NEATConfigOptions` from
  `@neat-evolution/core`.

- **`NEATGenome`**: Extends `CoreGenome` to represent a NEAT neural network. It
  includes methods for initializing the genome, handling hidden nodes and links,
  and converting to/from factory options and JSON. Supports per-node bias
  mutation via `mutateNodeBias()`.

- **`neat(...)` function**: The main entry point for running the NEAT algorithm.
  It takes a `ReproducerFactory`, an `Evaluator`, `EvolutionOptions`,
  `NEATConfigOptions`, `PopulationOptions`, and `NEATGenomeOptions` to set up
  and execute the evolutionary process.

- **`createPhenotype`**: Decodes a genome into a `Phenotype` for execution.
  Reads each node's `bias` value. Sets `trainableBiases: false` unless
  `useBias: true` in genome options.

- **Factory Functions (`createConfig`, `createGenome`, `createLink`,
  `createNode`, `createPopulation`, `createState`)**: These functions are
  responsible for instantiating the various components of the NEAT algorithm
  with their specific NEAT implementations.

## Genome Options

`NEATGenomeOptions` extends `GenomeOptions` from core and controls how genomes
are initialized and mutated.

| Option                         | Type                   | Default            | Description                                              |
| ------------------------------ | ---------------------- | ------------------ | -------------------------------------------------------- |
| `hiddenActivation`             | `Activation`           | `Activation.Sigmoid` | Activation function for hidden nodes                   |
| `outputActivation`             | `OutputActivationSpec` | `Activation.Sigmoid` | Activation function(s) for output nodes                |
| `useBias`                      | `boolean`              | `false`            | Enable trainable biases in the phenotype                 |
| `mutateHiddenBiasProbability`  | `number`               | `0`                | Probability of mutating a hidden node's bias per generation |
| `mutateHiddenBiasSize`         | `number`               | `0.03`             | Gaussian std dev for hidden bias mutations               |
| `mutateOutputBiasProbability`  | `number`               | `0`                | Probability of mutating an output node's bias per generation |
| `mutateOutputBiasSize`         | `number`               | `0.03`             | Gaussian std dev for output bias mutations               |

Two pre-built defaults are provided:

- **`defaultNEATGenomeOptions`** -- Pure NEAT. Bias mutation disabled
  (`mutateHiddenBiasProbability: 0`, `mutateOutputBiasProbability: 0`).
  Structural evolution only.
- **`defaultBackpropNEATGenomeOptions`** -- Lamarckian/backprop mode. Sets
  `useBias: true` and both bias mutation probabilities to `0.3`.

### Backprop / Lamarckian Mode

In Lamarckian mode, networks are trained via backprop during their lifetime and
the learned weights and biases are written back into the genome for inheritance.

To enable this mode:

1. Use `defaultBackpropNEATGenomeOptions` (or set `useBias: true` and bias
   mutation probabilities manually).
2. Create a `TrainableExecutor` via `createTrainableExecutor()` from
   `@neat-evolution/executor`.
3. After training, call `getUpdatedActions()` on the executor to obtain a
   `WritebackPayload`.
4. Pass the payload to `NEATAlgorithm.writeBackWeights()`, which applies link
   weight updates and node bias deltas back to the genome.

When `useBias` is `false` (default), `createPhenotype` sets
`trainableBiases: false` on the phenotype, so backprop skips bias updates even
if a `TrainableExecutor` is used.

## Usage

To run the NEAT algorithm, you typically call the `neat` function, providing it
with the necessary factories and options.

```typescript
import { defaultNEATConfigOptions } from "@neat-evolution/core";
import {
  defaultNEATGenomeOptions,
  defaultBackpropNEATGenomeOptions,
  neat,
  NEATAlgorithm,
} from "@neat-evolution/neat";

// Pure NEAT (default) -- structural evolution only, no bias mutation
const genomeOptions = { ...defaultNEATGenomeOptions };

// Lamarckian / backprop mode -- trainable biases + bias mutation between generations
const backpropGenomeOptions = { ...defaultBackpropNEATGenomeOptions };
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
