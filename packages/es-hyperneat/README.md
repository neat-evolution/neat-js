# @neat-evolution/es-hyperneat

The `@neat-evolution/es-hyperneat` package implements the ES-HyperNEAT (Evolving
Substrates HyperNEAT) algorithm. ES-HyperNEAT is an advanced variant of
HyperNEAT that introduces a dynamic substrate generation process based on a
divide-and-conquer search mechanism. Instead of pre-defining the substrate's
structure, ES-HyperNEAT queries the CPPN at various resolutions to discover
connections, leading to more flexible and potentially more efficient network
designs.

## Purpose

The primary purpose of the `@neat-evolution/es-hyperneat` package is to:

- **Implement ES-HyperNEAT:** Provide a robust implementation of the
  ES-HyperNEAT algorithm, focusing on its unique dynamic substrate generation.
- **Dynamic Substrate Discovery:** Utilize a sophisticated search process
  (`exploreSubstrate`, `findConnections`) to determine the significant
  connections in the substrate based on the CPPN's output values, rather than
  relying on a fixed grid.
- **Optimize Network Complexity:** Potentially reduce the complexity of the
  evolved neural networks by only creating connections and nodes in the
  substrate where they are most relevant, as identified by the CPPN's output
  variance.
- **Enhance Generalization:** Improve the generalization capabilities of evolved
  networks by allowing for more adaptive and context-dependent phenotypic
  expressions.

## How it Fits into the Ecosystem

The `es-hyperneat` package sits at a higher level of abstraction, leveraging
both the `neat` and `cppn` packages extensively. It integrates with other
packages in the `neat-js` monorepo as follows:

- **`@neat-evolution/core`**: Provides fundamental NEAT concepts and data
  structures.
- **`@neat-evolution/neat`**: Re-exports `createConfig`, `createLink`, and
  `createState` from `neat`, signifying its reliance on NEAT's evolutionary and
  genetic mechanisms.
- **`@neat-evolution/cppn`**: Re-exports `createNode` from `cppn`, and the
  ES-HyperNEAT genome is essentially a specialized CPPN genome. The CPPN is the
  composition system that determines the weight and existence of connections in
  the substrate.
- **`@neat-evolution/evolution`**: The `eshyperneat` function orchestrates the
  evolutionary process by creating a population of CPPN genomes and calling the
  `evolve` function from this package.
- **`@neat-evolution/evaluator`**: Requires an `Evaluator` instance to assess
  the fitness of evolved ES-HyperNEAT (CPPN) genomes by evaluating the
  performance of their generated substrate networks.
- **`@neat-evolution/demo`**: The `demo` package uses
  `@neat-evolution/es-hyperneat` to demonstrate the ES-HyperNEAT algorithm in
  action.

## Installation

To install the `@neat-evolution/es-hyperneat` package, use the following
command:

```sh
yarn add @neat-evolution/es-hyperneat
```

This package also requires several peer dependencies to function correctly.
Ensure you have installed the necessary `@neat-evolution` packages as described
in the main repository `README.md`.

## Key Components

The `es-hyperneat` package exposes several important classes, interfaces, and
functions:

- **`ESHyperNEATAlgorithm`**: An object conforming to the `Algorithm` interface,
  encapsulating the factory functions for creating ES-HyperNEAT specific
  configurations, genomes (which are CPPN genomes), phenotypes, and states.
- **`eshyperneat(...)` function**: The main entry point for running the
  ES-HyperNEAT algorithm. It takes a `ReproducerFactory`, an `Evaluator`,
  `EvolutionOptions`, `NEATConfigOptions`, `PopulationOptions`, and
  `ESHyperNEATGenomeOptions` to set up and execute the evolutionary process. The
  function manages the evolution of CPPN genomes that define the ES-HyperNEAT
  substrate.
- **`ESHyperNEATGenomeOptions` and `defaultESHyperNEATGenomeOptions`**: Define
  configurable parameters specific to ES-HyperNEAT, including parameters for the
  search process (e.g., `varianceThreshold`, `divisionThreshold`,
  `initialResolution`, `maxResolution`), input/output configurations, and
  activation functions for hidden and output layers of the substrate.
- **`exploreSubstrate`, `findConnections` (from `search` directory)**: These are
  core functions that implement the dynamic search process. `exploreSubstrate`
  recursively queries the CPPN, and `findConnections` identifies significant
  connections.
- **`QuadPoint`**: A utility class or type (from `search` directory) used to
  represent points in a quadtree-like structure during the substrate exploration
  process.

## Usage

To run the ES-HyperNEAT algorithm, you typically call the `eshyperneat`
function, providing it with the necessary factories and options. This function
will then manage the evolutionary process of CPPN genomes, which are used to
dynamically construct the substrate networks.

```typescript
import { defaultNEATConfigOptions } from "@neat-evolution/core";
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from "@neat-evolution/dataset-environment";
import { createEvaluator } from "@neat-evolution/evaluator";
import {
  createReproducer,
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from "@neat-evolution/evolution";

import {
  defaultESHyperNEATGenomeOptions,
  eshyperneat,
  ESHyperNEATAlgorithm,
} from "@neat-evolution/es-hyperneat";

async function runESHyperNEATExample() {
  // 1. Setup the environment
  const datasetOptions = {
    ...defaultDatasetOptions,
    dataset: "./path/to/your/dataset.txt",
  };
  const dataset = await loadDataset(datasetOptions);
  const environment = new DatasetEnvironment(dataset);

  // 2. Create an evaluator
  const evaluator = createEvaluator(ESHyperNEATAlgorithm, environment, null);

  // 3. Define evolution options
  const evolutionOptions = { ...defaultEvolutionOptions, iterations: 100 };

  // 4. Define NEAT-specific configuration (used by ES-HyperNEAT as well)
  const neatConfigOptions = { ...defaultNEATConfigOptions };

  // 5. Define population options
  const populationOptions = { ...defaultPopulationOptions };

  // 6. Define ES-HyperNEAT genome options
  const esHyperNEATGenomeOptions = { ...defaultESHyperNEATGenomeOptions };

  // 7. Run the ES-HyperNEAT algorithm
  const bestCPPNGenome = await eshyperneat(
    createReproducer,
    evaluator,
    evolutionOptions,
    neatConfigOptions,
    populationOptions,
    esHyperNEATGenomeOptions,
  );

  console.log("Best CPPN genome found for ES-HyperNEAT:", bestCPPNGenome);
}

runESHyperNEATExample();
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
