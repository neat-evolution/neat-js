# @neat-evolution/neat

The `@neat-evolution/neat` package provides the core implementation of the
NeuroEvolution of Augmenting Topologies (NEAT) algorithm. It builds upon the
foundational components defined in `@neat-evolution/core` to offer a complete,
functional NEAT system capable of evolving neural network topologies and weights
to solve various problems.

## Purpose

The primary purpose of the `@neat-evolution/neat` package is to:

- **Implement the NEAT Algorithm:** Provide a faithful and robust implementation
  of the original NEAT algorithm, including its mechanisms for speciation,
  crossover, and mutation.
- **Extend Core Functionality:** Specialize the generic `CoreGenome`,
  `CoreConfig`, and `CoreState` from `@neat-evolution/core` to fit the specific
  requirements of NEAT.
- **Facilitate Neuroevolution:** Offer the necessary tools and functions to run
  an evolutionary process, allowing neural networks to adapt and improve over
  generations.
- **Serve as a Baseline:** Act as the standard NEAT implementation against which
  more advanced NEAT variants (like HyperNEAT) can be compared and built upon.

## How it Fits into the Ecosystem

The `neat` package is a central piece of the `neat-js` monorepo, directly
utilizing and extending several other packages:

- **`@neat-evolution/core`**: Provides the fundamental `Algorithm`,
  `CoreGenome`, `CoreConfig`, `CoreState`, `Node`, and `Link` abstractions that
  `neat` specializes.

- **`@neat-evolution/evolution`**: The `neat` function orchestrates the
  evolutionary process by creating a population and calling the `evolve`
  function from this package.

- **`@neat-evolution/evaluator`**: Requires an `Evaluator` instance to assess
  the fitness of evolved NEAT genomes.

- **`@neat-evolution/utils`**: Leverages utility functions for random number
  generation and other common tasks.

- **`@neat-evolution/demo`**: The `demo` package uses `@neat-evolution/neat` to
  demonstrate the basic NEAT algorithm in action.

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
  NEAT-specific configurations, genomes, phenotypes, and states.

- **`NEATConfig`**: Extends `CoreConfig` to provide NEAT-specific configuration
  options. It primarily wraps the `NEATConfigOptions` from
  `@neat-evolution/core`.

- **`NEATGenome`**: Extends `CoreGenome` to represent a NEAT neural network. It
  includes methods for initializing the genome, handling hidden nodes and links,
  and converting to/from factory options and JSON.

- **`neat(...)` function**: The main entry point for running the NEAT algorithm.
  It takes a `ReproducerFactory`, an `Evaluator`, `EvolutionOptions`,
  `NEATConfigOptions`, `PopulationOptions`, and `NEATGenomeOptions` to set up
  and execute the evolutionary process.

- **Factory Functions (`createConfig`, `createGenome`, `createLink`,
  `createNode`, `createPhenotype`, `createPopulation`, `createState`)**: These
  functions are responsible for instantiating the various components of the NEAT
  algorithm with their specific NEAT implementations.

## Usage

To run the NEAT algorithm, you typically call the `neat` function, providing it
with the necessary factories and options. This function will then manage the
evolutionary process and return the best-performing genome found.

```typescript

import { defaultNEATConfigOptions } from "@neat-evolution/core";
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from "@neat-evolution/dataset-environment";
import { createEvaluator } from "@neat-evolution/evaluator"; // Assuming a standard evaluator
import {
  createReproducer,
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from "@neat-evolution/evolution";

import {
  defaultNEATGenomeOptions,
  neat,
  NEATAlgorithm,
} from "@neat-evolution/neat";

async function runNeatExample() {
  // 1. Setup the environment (e.g., a dataset environment)

  const datasetOptions = {
    ...defaultDatasetOptions,
    dataset: "./path/to/your/dataset.txt",
  };

  const dataset = await loadDataset(datasetOptions);

  const environment = new DatasetEnvironment(dataset);

  // 2. Create an evaluator

  const evaluator = createEvaluator(NEATAlgorithm, environment, null); // null for executor if not needed directly

  // 3. Define evolution options

  const evolutionOptions = { ...defaultEvolutionOptions, iterations: 100 };

  // 4. Define NEAT-specific configuration

  const neatConfigOptions = { ...defaultNEATConfigOptions };

  // 5. Define population options

  const populationOptions = { ...defaultPopulationOptions };

  // 6. Define genome options

  const genomeOptions = { ...defaultNEATGenomeOptions };

  // 7. Run the NEAT algorithm

  const bestGenome = await neat(
    createReproducer,
    evaluator,
    evolutionOptions,
    neatConfigOptions,
    populationOptions,
    genomeOptions,
  );

  console.log("Best genome found:", bestGenome);
}

runNeatExample();
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
