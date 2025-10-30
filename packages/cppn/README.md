# @neat-evolution/cppn

The `@neat-evolution/cppn` package implements the Compositional Pattern Producing Networks (CPPNs) algorithm, which is an extension of the NeuroEvolution of Augmenting Topologies (NEAT) algorithm. CPPNs are a type of neural network whose activation functions vary and can be evolved, allowing them to produce complex, regular, and repeating patterns. This package builds upon the core NEAT implementation from `@neat-evolution/neat` by specializing its genome and node structures to incorporate these features.

## Purpose

The primary purpose of the `@neat-evolution/cppn` package is to:

*   **Implement CPPNs:** Provide a robust implementation of the CPPN algorithm, enabling the evolution of neural networks with diverse activation functions and biases.
*   **Extend NEAT:** Specialize the `NEATGenome` and `NEATNode` from `@neat-evolution/neat` to include CPPN-specific properties and behaviors.
*   **Generate Complex Patterns:** Facilitate the use of CPPNs for tasks requiring the generation of intricate and structured outputs, such as image generation or robotic control policies.
*   **Support HyperNEAT:** Serve as a foundational component for HyperNEAT implementations, where CPPNs are used to evolve the connectivity patterns of larger neural networks.

## How it Fits into the Ecosystem

The `cppn` package is a direct extension of the `neat` package, leveraging its core evolutionary mechanisms while introducing CPPN-specific enhancements. It integrates with other packages in the `neat-js` monorepo as follows:

*   **`@neat-evolution/core`**: Provides the fundamental `Algorithm`, `CoreGenome`, `CoreConfig`, `CoreState`, `Node`, and `Link` abstractions.
*   **`@neat-evolution/neat`**: The `cppn` package re-exports `createConfig`, `createLink`, and `createState` from `@neat-evolution/neat`, indicating a strong reliance on its base implementation. `CPPNGenome` extends `CoreGenome` (which is effectively `NEATGenome` in this context).
*   **`@neat-evolution/evolution`**: The `cppn` function orchestrates the evolutionary process by creating a population and calling the `evolve` function from this package.
*   **`@neat-evolution/evaluator`**: Requires an `Evaluator` instance to assess the fitness of evolved CPPN genomes.
*   **`@neat-evolution/utils`**: Utilizes utility functions for random number generation during mutations.
*   **`@neat-evolution/demo`**: The `demo` package uses `@neat-evolution/cppn` to demonstrate the CPPN algorithm in action.

## Key Components

The `cppn` package exposes several important classes, interfaces, and functions:

*   **`CPPNAlgorithm`**: An object conforming to the `Algorithm` interface, encapsulating the factory functions for creating CPPN-specific configurations, genomes, phenotypes, and states.

*   **`CPPNGenome<GO>`**: Extends `CoreGenome` (effectively `NEATGenome`) to represent a CPPN. It includes additional mutation methods for hidden and output node biases and activation functions. It also provides methods to retrieve the activation and bias of a given node.

*   **`CPPNNode`**: Extends `CoreNode` to represent a node within a CPPN. Unlike standard NEAT nodes, `CPPNNode`s have an `activation` function and a `bias` value, both of which can be evolved. It also defines how `CPPNNode`s are crossed over and how their genetic distance is calculated.

*   **`cppn(...)` function**: The main entry point for running the CPPN algorithm. Similar to the `neat` function, it takes a `ReproducerFactory`, an `Evaluator`, `EvolutionOptions`, `NEATConfigOptions`, `PopulationOptions`, and `CPPNGenomeOptions` to set up and execute the evolutionary process.

*   **`CPPNGenomeOptions` and `defaultCPPNGenomeOptions`**: Define configurable parameters specific to CPPN genomes, such as probabilities for mutating node biases and activation functions, and the available activation functions for hidden and output nodes.

*   **Factory Functions (`createGenome`, `createNode`, `createPhenotype`, `createPopulation`)**: These functions are responsible for instantiating the various components of the CPPN algorithm with their specific CPPN implementations.

## Usage

To run the CPPN algorithm, you typically call the `cppn` function, providing it with the necessary factories and options. This function will then manage the evolutionary process and return the best-performing genome found.

```typescript
import { cppn, CPPNAlgorithm, defaultCPPNGenomeOptions } from '@neat-evolution/cppn';
import { defaultNEATConfigOptions } from '@neat-evolution/core';
import { defaultEvolutionOptions, defaultPopulationOptions, createReproducer } from '@neat-evolution/evolution';
import { createEvaluator } from '@neat-evolution/evaluator';
import { DatasetEnvironment, loadDataset, defaultDatasetOptions } from '@neat-evolution/dataset-environment';

async function runCppyExample() {
  // 1. Setup the environment (e.g., a dataset environment)
  const datasetOptions = { ...defaultDatasetOptions, dataset: './path/to/your/dataset.txt' };
  const dataset = await loadDataset(datasetOptions);
  const environment = new DatasetEnvironment(dataset);

  // 2. Create an evaluator
  const evaluator = createEvaluator(CPPNAlgorithm, environment, null);

  // 3. Define evolution options
  const evolutionOptions = { ...defaultEvolutionOptions, iterations: 100 };

  // 4. Define NEAT-specific configuration (used by CPPN as well)
  const neatConfigOptions = { ...defaultNEATConfigOptions };

  // 5. Define population options
  const populationOptions = { ...defaultPopulationOptions };

  // 6. Define CPPN genome options
  const cppnGenomeOptions = { ...defaultCPPNGenomeOptions };

  // 7. Run the CPPN algorithm
  const bestGenome = await cppn(
    createReproducer,
    evaluator,
    evolutionOptions,
    neatConfigOptions,
    populationOptions,
    cppnGenomeOptions
  );

  console.log('Best CPPN genome found:', bestGenome);
}

runCppyExample();
```
