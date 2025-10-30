# @neat-evolution/hyperneat

The `@neat-evolution/hyperneat` package implements the HyperNEAT (Hypercube-based NeuroEvolution of Augmenting Topologies) algorithm. HyperNEAT is an extension of NEAT that uses Compositional Pattern Producing Networks (CPPNs) to evolve the connectivity patterns of a larger, fixed-topology neural network called a "substrate." This approach allows for the evolution of highly complex and regular neural network structures, often exhibiting properties like repetition and symmetry.

## Purpose

The primary purpose of the `@neat-evolution/hyperneat` package is to:

*   **Implement HyperNEAT:** Provide a robust implementation of the HyperNEAT algorithm, enabling the evolution of substrate-based neural networks.
*   **Leverage CPPNs:** Utilize CPPNs (from `@neat-evolution/cppn`) as the "indirect encoding" mechanism to generate the weights and connections of the substrate network.
*   **Evolve Complex Architectures:** Facilitate the evolution of neural networks with intricate and spatially organized connectivity, which can be beneficial for tasks with inherent spatial relationships (e.g., vision, robotics).
*   **Provide Substrate Management:** Define and manage the substrate network, including its nodes, connections, and the process of querying the CPPN to determine its structure.

## How it Fits into the Ecosystem

The `hyperneat` package is a significant extension of the core NEAT and CPPN functionalities. It integrates with other packages in the `neat-js` monorepo as follows:

*   **`@neat-evolution/core`**: Provides fundamental NEAT concepts and data structures.
*   **`@neat-evolution/neat`**: HyperNEAT builds upon the evolutionary mechanisms and genome structure defined in the `neat` package.
*   **`@neat-evolution/cppn`**: This is a crucial dependency, as CPPNs are used as the "brain" that designs the substrate network. The `hyperneat` package will query a CPPN genome to determine the properties of the substrate's connections.
*   **`@neat-evolution/evolution`**: The `hyperneat` function orchestrates the evolutionary process by creating a population of CPPN genomes and calling the `evolve` function from this package.
*   **`@neat-evolution/evaluator`**: Requires an `Evaluator` instance to assess the fitness of evolved HyperNEAT (CPPN) genomes by evaluating the performance of their generated substrate networks.
*   **`@neat-evolution/demo`**: The `demo` package uses `@neat-evolution/hyperneat` to demonstrate the HyperNEAT algorithm in action.

## Key Components

The `hyperneat` package exposes several important classes, interfaces, and functions:

*   **`HyperNEATAlgorithm`**: An object conforming to the `Algorithm` interface, encapsulating the factory functions for creating HyperNEAT-specific configurations, genomes (which are CPPN genomes), phenotypes, and states.
*   **`hyperneat(...)` function**: The main entry point for running the HyperNEAT algorithm. It takes a `ReproducerFactory`, an `Evaluator`, `EvolutionOptions`, `NEATConfigOptions`, `PopulationOptions`, and `HyperNEATGenomeOptions` to set up and execute the evolutionary process. Note that the "genome" being evolved here is actually a CPPN genome.
*   **`HyperNEATGenomeOptions` and `defaultHyperNEATGenomeOptions`**: Define configurable parameters specific to HyperNEAT, such as the structure of the substrate and how the CPPN maps to it.
*   **`Substrate`**: This class (likely found in `substrate/Substrate.ts` or similar) represents the fixed-topology neural network whose connections are determined by the CPPN. It defines the input, hidden, and output layers, and how the CPPN is queried to establish connections and weights.
*   **`Point` and `PointKey`**: Types and utility functions for representing 2D coordinates on the substrate and converting them to unique string keys.
*   **`SubstrateAction`**: Defines actions that can be performed on the substrate, such as activating a node or creating a link, along with their spatial coordinates.

## Usage

To run the HyperNEAT algorithm, you typically call the `hyperneat` function, providing it with the necessary factories and options. This function will then manage the evolutionary process of CPPN genomes, which in turn design the substrate networks.

```typescript
import { hyperneat, HyperNEATAlgorithm, defaultHyperNEATGenomeOptions } from '@neat-evolution/hyperneat';
import { defaultNEATConfigOptions } from '@neat-evolution/core';
import { defaultEvolutionOptions, defaultPopulationOptions, createReproducer } from '@neat-evolution/evolution';
import { createEvaluator } from '@neat-evolution/evaluator';
import { DatasetEnvironment, loadDataset, defaultDatasetOptions } from '@neat-evolution/dataset-environment';

async function runHyperNEATExample() {
  // 1. Setup the environment (e.g., a dataset environment)
  const datasetOptions = { ...defaultDatasetOptions, dataset: './path/to/your/dataset.txt' };
  const dataset = await loadDataset(datasetOptions);
  const environment = new DatasetEnvironment(dataset);

  // 2. Create an evaluator
  const evaluator = createEvaluator(HyperNEATAlgorithm, environment, null);

  // 3. Define evolution options
  const evolutionOptions = { ...defaultEvolutionOptions, iterations: 100 };

  // 4. Define NEAT-specific configuration (used by HyperNEAT as well)
  const neatConfigOptions = { ...defaultNEATConfigOptions };

  // 5. Define population options
  const populationOptions = { ...defaultPopulationOptions };

  // 6. Define HyperNEAT genome options (these will configure the substrate)
  const hyperNEATGenomeOptions = { ...defaultHyperNEATGenomeOptions };

  // 7. Run the HyperNEAT algorithm
  const bestCPPNGenome = await hyperneat(
    createReproducer,
    evaluator,
    evolutionOptions,
    neatConfigOptions,
    populationOptions,
    hyperNEATGenomeOptions
  );

  console.log('Best CPPN genome found for HyperNEAT:', bestCPPNGenome);
}

runHyperNEATExample();
```
