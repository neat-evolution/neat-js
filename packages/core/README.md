# @neat-evolution/core

The `@neat-evolution/core` package serves as the foundational layer for the
entire `neat-js` monorepo. It defines the essential interfaces, classes, and
utilities required to represent, manipulate, and evolve neural networks using
the NeuroEvolution of Augmenting Topologies (NEAT) algorithm and its variants.
This package establishes the core concepts of genomes, nodes, links,
configurations, and the fundamental operations of mutation, crossover, and
Lamarckian writeback.

## Purpose

The primary purpose of the `@neat-evolution/core` package is to:

- **Define Core Data Structures:** Provide the basic building blocks for neural
  networks, including `Node`, `Link`, and `Genome` representations. Every
  `CoreNode` carries a `bias: number` field (defaults to 0), which is included
  in crossover (averaged), distance calculation, and serialization.
- **Establish NEAT Principles:** Implement the fundamental mechanisms of NEAT,
  such as genetic distance calculation, mutation operators (adding/removing
  nodes and links, mutating weights and biases), and crossover.
- **Provide Configuration:** Offer a standardized way to configure NEAT
  algorithm parameters via `NEATConfigOptions` (structural mutation
  probabilities) and `GenomeOptions` (the base type all algorithm-specific
  genome options extend).
- **Enable Extensibility:** Define generic interfaces (`Algorithm`, `Genome`,
  `Phenotype`, etc.) that allow for the implementation of various NEAT-based
  algorithms (e.g., CPPN, HyperNEAT) while reusing core functionalities.
- **Support Lamarckian Writeback:** Define `WritebackPayload` and the
  `Phenotype` hooks (`trainableBiases`, `chainBackward`, `transformWriteback`)
  that enable backprop-trained weights and biases to be written back into
  genomes between generations.
- **Manage Network Topology:** Handle the dynamic creation and modification of
  neural network connections, including cycle detection and topological sorting.

## How it Fits into the Ecosystem

The `core` package is a dependency for almost all other packages in the
`neat-js` monorepo. It provides the abstract concepts and concrete
implementations that other specialized NEAT algorithms build upon. For instance:

- **`@neat-evolution/neat`**: Implements the specific NEAT algorithm using the
  core genome and configuration.
- **`@neat-evolution/cppn`**, **`@neat-evolution/hyperneat`**,
  **`@neat-evolution/es-hyperneat`**, **`@neat-evolution/des-hyperneat`**: These
  packages extend the core genome and algorithm definitions to implement their
  respective NEAT variants.
- **`@neat-evolution/evolution`**: Utilizes the core genome's mutation and
  crossover capabilities to drive the evolutionary process.
- **`@neat-evolution/evaluator`**: Works with genomes defined in `core` to
  evaluate their fitness.
- **`@neat-evolution/executor`**: Provides `createTrainableExecutor()` for
  backprop, consuming the `Phenotype` hooks defined here.

Essentially, `core` provides the "what" and "how" of NEAT's genetic
representation and evolution, while other packages provide the "which algorithm"
and "in what context."

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
yarn add @neat-evolution/core
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/core
```

## Key Components

The `core` package exposes several important components:

- **`Activation`**: An enum defining various activation functions (e.g.,
  `Sigmoid`, `ReLU`, `Tanh`) that can be applied to neural network nodes.
- **`Algorithm<...>`**: A generic interface that outlines the structure for any
  NEAT-based algorithm, specifying how to create configurations, genomes,
  phenotypes, and states. Includes `writeBackWeights` for Lamarckian writeback.
- **`Connections<N, E>`**: A class for managing the graph of connections between
  nodes. It handles adding/removing connections, checking for cycles, and
  providing topological information.
- **`CoreNode`**: The base node class. Each node has a `bias: number` field
  (defaults to 0). Bias is averaged during crossover and contributes to genetic
  distance via `0.5 * tanh(|delta|)`.
- **`CoreGenome<...>`**: The central class representing a neural network's
  genetic blueprint. It manages nodes (inputs, hidden, outputs) and links, and
  provides methods for mutation (including `mutateNodeBias()` for hidden and
  output nodes), crossover, and genetic distance calculation.
- **`GenomeOptions`**: The base type that all algorithm-specific genome options
  extend (e.g., `NEATGenomeOptions`, `CPPNGenomeOptions`).
- **`NEATConfigOptions`**: An interface defining configurable parameters for the
  NEAT algorithm, such as probabilities for structural mutations and weights for
  genetic distance calculation. `defaultNEATConfigOptions` provides a standard
  set of these parameters.
- **`NodeFactoryOptions`**: Includes `type`, `id`, and `bias?: number` for
  constructing nodes with an initial bias value.
- **`Phenotype`**: The decoded network ready for execution. Key fields:
  - `trainableBiases?: boolean` -- whether backprop should train biases
    (default `true`; NEAT sets `false` unless `useBias` is enabled).
  - `chainBackward?` -- chains gradient signal through to the underlying CPPN
    (set by HyperNEAT variants).
  - `transformWriteback?` -- transforms substrate gradients into CPPN-level
    writeback actions.
  - `coordinateMap?` -- substrate-to-CPPN coordinate metadata.
- **`WritebackPayload`**: Algorithm-agnostic payload for Lamarckian writeback.
  Carries `actions` (link weight updates), optional `auxiliary` per-sub-CPPN
  writebacks, and optional `nodeBiasDeltas` for direct bias updates.

## Usage

Developers building new NEAT algorithms or extending existing ones within the
`neat-js` ecosystem will frequently interact with the types and classes exported
by `@neat-evolution/core`. It provides the necessary abstractions and concrete
implementations to manage the genetic representation and evolutionary dynamics
of neural networks.

```typescript
import {
  Activation,
  CoreGenome,
  defaultNEATConfigOptions,
  type WritebackPayload,
  type Phenotype,
} from "@neat-evolution/core";
// ... other imports and setup for config, state, nodeFactory, linkFactory, genomeFactory

// Example of using default NEAT configuration options
const neatConfig = defaultNEATConfigOptions;

// Example of an activation function
const activationType = Activation.Sigmoid;

// CoreGenome is typically extended by specific NEAT implementations
// For example, in @neat-evolution/neat, a NEATGenome would extend CoreGenome
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
