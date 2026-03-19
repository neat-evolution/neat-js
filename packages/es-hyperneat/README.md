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
yarn add @neat-evolution/es-hyperneat
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/es-hyperneat
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
  Includes `writeBackWeights` for applying Lamarckian weight updates.
- **`eshyperneat(...)` function**: The main entry point for running the
  ES-HyperNEAT algorithm. It takes a `ReproducerFactory`, an `Evaluator`,
  `EvolutionOptions`, `NEATConfigOptions`, `PopulationOptions`, and
  `ESHyperNEATGenomeOptions` to set up and execute the evolutionary process. The
  function manages the evolution of CPPN genomes that define the ES-HyperNEAT
  substrate.
- **`ESHyperNEATGenomeOptions` and `defaultESHyperNEATGenomeOptions`**: Define
  configurable parameters specific to ES-HyperNEAT, including parameters for the
  search process (e.g., `varianceThreshold`, `divisionThreshold`,
  `initialResolution`, `maxResolution`), input/output configurations, activation
  functions for hidden and output layers of the substrate, and the
  `cppnLearningRate` option for Lamarckian training.
- **`exploreSubstrate`, `findConnections` (from `search` directory)**: These are
  core functions that implement the dynamic search process. `exploreSubstrate`
  recursively queries the CPPN, and `findConnections` identifies significant
  connections.
- **`QuadPoint`**: A utility class or type (from `search` directory) used to
  represent points in a quadtree-like structure during the substrate exploration
  process.

## Genome Options

`ESHyperNEATGenomeOptions` extends both `GenomeOptions` and `CPPNGenomeOptions`,
providing all CPPN and NEAT parameters plus ES-HyperNEAT-specific search
settings. Key fields and their defaults:

| Option | Default | Description |
| --- | --- | --- |
| `varianceThreshold` | `0.2` | Minimum variance for a quadtree region to be explored further |
| `divisionThreshold` | `0.2` | Minimum weight magnitude for a connection to be included |
| `bandThreshold` | `0.3` | Band-pruning threshold for connection filtering |
| `initialResolution` | `4` | Starting resolution for quadtree subdivision |
| `maxResolution` | `5` | Maximum subdivision depth |
| `iterationLevel` | `3` | Number of hidden-layer iterations during substrate discovery |
| `resolution` | `1048576` | Coordinate-space resolution for substrate points |
| `maxDiscoveries` | `256` | Maximum hidden nodes discovered per exploration |
| `maxOutgoing` | `32` | Maximum outgoing connections per discovered node |
| `hiddenActivation` | `Activation.None` | Activation function for hidden substrate nodes |
| `outputActivation` | `Activation.Softmax` | Activation function for output substrate nodes |
| `maxVariance` | `false` | Use max instead of average variance in quadtree |
| `relativeVariance` | `false` | Scale variance relative to parent region |
| `medianVariance` | `false` | Use median instead of mean for variance |
| `onlyLeafVariance` | `true` | Only evaluate variance at leaf-level regions |
| `cppnLearningRate` | `undefined` | Override learning rate for CPPN training during Lamarckian writeback |

ES-HyperNEAT inherits the CPPN bias mutation defaults
(`mutateHiddenBiasProbability: 0.8`, `mutateOutputBiasProbability: 0.8`), which
means CPPN node biases are mutated during evolution by default.

## Lamarckian Training

ES-HyperNEAT supports Lamarckian training (backpropagation-driven weight
updates that are written back to the evolved CPPN genome). This allows the
substrate network to be trained with gradient descent while preserving learned
weights across evolutionary generations.

The phenotype produced by `createPhenotype` exposes two methods for this:

- **`chainBackward(gradients, lr)`** -- Routes substrate gradients back to the
  CPPN. For each link in the substrate, the gradient is chained through the
  CPPN coordinate mapping (x0, y0, x1, y1) to update CPPN weights. For each
  node, bias gradients are routed similarly. Gradient averaging is applied so
  the effective CPPN learning rate is independent of substrate size.

- **`transformWriteback()`** -- Returns a `WritebackPayload` containing the
  updated CPPN action weights after training. The algorithm's `writeBackWeights`
  method applies these to the genome so the learned adjustments persist across
  generations.

### `cppnLearningRate`

By default, `chainBackward` uses the substrate learning rate passed to it. Set
`cppnLearningRate` on the genome options to override this with a fixed rate for
CPPN training. This is useful when the substrate learning rate is tuned for the
task but the CPPN benefits from a different rate.

```typescript
const genomeOptions = {
  ...defaultESHyperNEATGenomeOptions,
  cppnLearningRate: 0.001, // fixed CPPN learning rate
};
```

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
