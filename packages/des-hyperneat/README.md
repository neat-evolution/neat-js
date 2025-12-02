# @neat-evolution/des-hyperneat

The `@neat-evolution/des-hyperneat` package implements the Dynamic Evolving
Substrates HyperNEAT (DES-HyperNEAT) algorithm. DES-HyperNEAT is an advanced and
highly specialized variant of HyperNEAT that allows for the evolution of both
the CPPN (Compositional Pattern Producing Network) and the substrate's topology
and depth. This enables a more flexible and adaptive approach to generating
complex neural network architectures, moving beyond fixed-layer substrates.

## Purpose

The primary purpose of the `@neat-evolution/des-hyperneat` package is to:

- **Implement DES-HyperNEAT:** Provide a robust and comprehensive implementation
  of the DES-HyperNEAT algorithm.
- **Evolve Substrate Topology and Depth:** Unlike traditional HyperNEAT,
  DES-HyperNEAT can evolve the number of layers, the arrangement of nodes within
  those layers, and the depth of connections in the substrate, leading to highly
  customized network structures.
- **Integrate CPPNs and NEAT:** Seamlessly combine the pattern-generating
  capabilities of CPPNs with the evolutionary mechanisms of NEAT, applied to
  both the CPPN itself and the substrate's structural properties.
- **Support Complex Architectures:** Facilitate the evolution of neural networks
  for problems requiring highly dynamic and adaptable architectures, potentially
  outperforming fixed-topology or simpler HyperNEAT variants.

## How it Fits into the Ecosystem

The `des-hyperneat` package represents a pinnacle of complexity within the
`neat-js` monorepo, building extensively on `core`, `neat`, and `cppn`. It
integrates with other packages as follows:

- **`@neat-evolution/core`**: Provides fundamental NEAT concepts and data
  structures, which are heavily extended and specialized here.
- **`@neat-evolution/neat`**: The evolutionary mechanisms and genetic operations
  are derived from or inspired by the `neat` package.
- **`@neat-evolution/cppn`**: CPPNs are central to DES-HyperNEAT, as they are
  evolved to define the weights and existence of connections, and potentially
  the properties of nodes, within the dynamic substrate.
- **`@neat-evolution/evolution`**: The `deshyperneat` function orchestrates the
  evolutionary process by creating a population and calling the `evolve`
  function from this package.
- **`@neat-evolution/evaluator`**: Requires an `Evaluator` instance to assess
  the fitness of evolved DES-HyperNEAT genomes by evaluating the performance of
  their generated substrate networks.
- **`@neat-evolution/demo`**: The `demo` package uses
  `@neat-evolution/des-hyperneat` to demonstrate this advanced algorithm in
  action.

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
yarn add @neat-evolution/des-hyperneat
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/des-hyperneat
```

This package also requires several peer dependencies to function correctly.
Ensure you have installed the necessary `@neat-evolution` packages as described
in the main repository `README.md`.

## Key Components

The `des-hyperneat` package exposes a rich set of classes, interfaces, and
functions:

- **`DESHyperNEATAlgorithm`**: An object conforming to the `Algorithm`
  interface, encapsulating the factory functions for creating DES-HyperNEAT
  specific configurations, genomes, phenotypes, and states.
- **`deshyperneat(...)` function**: The main entry point for running the
  DES-HyperNEAT algorithm. It takes a `ReproducerFactory`, an `Evaluator`,
  `EvolutionOptions`, `TopologyConfigOptions`, `NEATConfigOptions` (for the
  CPPN), `PopulationOptions`, and `DESHyperNEATGenomeOptions` to set up and
  execute the evolutionary process.
- **`DESHyperNEATGenome`**: A highly specialized genome that extends
  `CoreGenome`. It contains CPPN genomes for each node and link, allowing for
  the evolution of their properties. It includes mutation methods for node
  depths and the CPPN components of nodes and links.
- **`DESHyperNEATConfig`**: Extends `CoreConfig` and holds both the general
  `neatConfig` and a `cppn` specific configuration, reflecting the dual
  evolutionary nature of DES-HyperNEAT.
- **`TopologyConfigOptions` and `defaultTopologyConfigOptions`**: Define
  configurable parameters for the topology of the substrate, such as
  probabilities for adding/removing nodes and links, and weights for genetic
  distance, similar to `NEATConfigOptions` but applied to the substrate's
  structure.
- **`DESHyperNEATNode` and `DESHyperNEATLink`**: Specialized node and link
  implementations that each contain their own CPPN genome and depth information,
  allowing for their individual evolution.
- **`CustomState` and `CustomStateData`**: These indicate a custom state
  management system, likely to handle the complex innovation tracking required
  for dynamic substrate evolution.
- **`developer/parseNodes.ts`**: Suggests tools for parsing and potentially
  visualizing the evolved substrate structures.
- **`topology/topologyInitConfig.ts` and `topology/parseNumSubstrates.ts`**:
  Functions related to the initial setup and parsing of the dynamic substrate's
  configuration.

## Usage

To run the DES-HyperNEAT algorithm, you typically call the `deshyperneat`
function, providing it with the necessary factories and options. This function
will then manage the evolutionary process of the complex DES-HyperNEAT genomes.

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
  defaultDESHyperNEATGenomeOptions,
  defaultTopologyConfigOptions,
  deshyperneat,
  DESHyperNEATAlgorithm,
} from "@neat-evolution/des-hyperneat";

async function runDESHyperNEATExample() {
  // 1. Setup the environment
  const datasetOptions = {
    ...defaultDatasetOptions,
    dataset: "./path/to/your/dataset.txt",
  };
  const dataset = await loadDataset(datasetOptions);
  const environment = new DatasetEnvironment(dataset);

  // 2. Create an evaluator
  const evaluator = createEvaluator(DESHyperNEATAlgorithm, environment, null);

  // 3. Define evolution options
  const evolutionOptions = { ...defaultEvolutionOptions, iterations: 100 };

  // 4. Define topology configuration options
  const topologyConfigOptions = { ...defaultTopologyConfigOptions };

  // 5. Define CPPN configuration options (used by the CPPNs within DES-HyperNEAT)
  const cppnConfigOptions = { ...defaultNEATConfigOptions };

  // 6. Define population options
  const populationOptions = { ...defaultPopulationOptions };

  // 7. Define DES-HyperNEAT genome options
  const desHyperNEATGenomeOptions = { ...defaultDESHyperNEATGenomeOptions };

  // 8. Run the DES-HyperNEAT algorithm
  const bestDESHyperNEATGenome = await deshyperneat(
    createReproducer,
    evaluator,
    evolutionOptions,
    topologyConfigOptions,
    cppnConfigOptions,
    populationOptions,
    desHyperNEATGenomeOptions,
  );

  console.log("Best DES-HyperNEAT genome found:", bestDESHyperNEATGenome);
}

runDESHyperNEATExample();
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
