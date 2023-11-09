# @neat-evolution: Evolving Neural Networks in TypeScript

## Introduction

Welcome to `@neat-evolution`, a TypeScript library offering a modular implementation of the NEAT (NeuroEvolution of Augmenting Topologies) algorithm and its advanced variants, including HyperNEAT, ES-HyperNEAT, and DES-HyperNEAT.

Born from the translation of a Rust reference implementation, `@neat-evolution` bridges the gap between the robustness of Rust and the flexibility of TypeScript. It enables the evolution and execution of neural networks directly within both browser and Node.js environments. This project adheres to a monorepo structure that encapsulates a suite of packages, each tailored to specific aspects of neural network evolution and execution.

### Why `@neat-evolution`?

- **TypeScript**: Embrace the full power of TypeScript's static typing and modern syntax to build and evolve neural networks with confidence and clarity.
- **Browser & Node.js**: Run neural networks client-side or on the server, providing versatility for web applications and server-side solutions alike.
- **Monorepo**: A carefully structured monorepo ensures that all the moving parts of NEAT and its extensions are easily accessible and maintainable.

The core of NEAT's philosophy is to mimic natural evolution, introducing concepts from biology such as genomes, species, and mutations to optimize neural networks. By employing a genetic algorithm, `@neat-evolution` evolves a population of organisms over time, dynamically growing complexity and adapting structures to solve tasks ranging from simple XOR problems to controlling complex robotic systems.

Whether you're an academic, hobbyist, or professional developer, `@neat-evolution` provides the tools to experiment with and deploy neuroevolution strategies. Step into the world of evolvable neural topologies with `@neat-evolution` and discover the power of evolutionary algorithms for neural network training.

Follow along to get started with installation, dive into algorithm specifics, explore advanced configurations, and learn how to contribute to this evolving project.

## Installation

`@neat-evolution` is a highly modular and flexible library designed for the implementation of NeuroEvolution of Augmenting Topologies (NEAT) algorithms. It allows users to easily evolve neural networks for a variety of tasks.

### Quick Start

To quickly set up a basic NEAT environment, install the following core packages:

```sh
npm install @neat-evolution/core @neat-evolution/dataset-environment @neat-evolution/neat @neat-evolution/worker-evaluator @neat-evolution/executor @neat-evolution/worker-reproducer
```

Or, if you're using Yarn:

```sh
yarn add @neat-evolution/core @neat-evolution/dataset-environment @neat-evolution/neat @neat-evolution/worker-evaluator @neat-evolution/executor @neat-evolution/worker-reproducer
```

These packages provide the necessary components to begin creating and evolving neural networks:

- `@neat-evolution/core`: The fundamental neural network structures.
- `@neat-evolution/dataset-environment`: A default environment to train your networks.
- `@neat-evolution/neat`: The primary NEAT algorithm implementation.
- `@neat-evolution/worker-evaluator`: A parallelized evaluation system using web workers.
- `@neat-evolution/executor`: Executes neural networks and produces results.
- `@neat-evolution/worker-reproducer`: A web worker-based system for parallelized genetic operations.

### Customization Options
@neat-evolution offers a variety of packages for those who wish to tailor the library to their needs. You can choose different algorithms, executors, evaluators, or even build your own environment for a custom solution.

#### Implementing Custom Environments
To use a custom environment, install it alongside the core packages:

```sh
npm install @your-custom-environment
```

#### Choosing Alternative Algorithms
If you prefer a different flavor of the NEAT algorithm, you can install one of the alternatives:

```sh
npm install @neat-evolution/neat           # original algorithm
npm install @neat-evolution/cppn           # Compositional Pattern Producing Network
npm install @neat-evolution/hyperneat      # HyperNEAT algorithm
npm install @neat-evolution/es-hyperneat   # Evolvable Substrate HyperNEAT
npm install @neat-evolution/des-hyperneat  # Deep Evolvable Substrate HyperNEAT
```

## Quick Start

To help you get started with `@neat-evolution`, we've prepared a simple boilerplate that sets up a demo project using the NEAT algorithm to evolve a neural network with a dataset environment. Follow these steps to create your first evolution experiment.

### Setting up the Demo Project

First, ensure you have all the required `@neat-evolution` packages installed. If not, refer back to the installation section above.

Now, let's walk through the demo boilerplate code:

1. **Import Required Modules:**
   Import all the necessary modules from `@neat-evolution` that we will use to configure our NEAT setup. This includes the core configuration, dataset environment, evolution, NEAT algorithm, and worker utilities for parallel execution.

2. **Load Dataset:**
   Load your dataset using the `loadDataset` function. You'll need to specify the path to your dataset and any additional options such as the validation and test fraction.

3. **Create Environment:**
   Create the dataset environment with the loaded dataset for the NEAT algorithm to interact with during the evolution process.

4. **Configure Worker Pools:**
   Configure worker pools for parallel evaluation and reproduction of genomes. This is where `@neat-evolution/worker-evaluator` and `@neat-evolution/worker-reproducer` come into play.

5. **Define Reproducer and Evaluator:**
   Initialize the evaluator and define a reproducer factory function that will be responsible for creating new genomes.

6. **Evolution Configuration:**
   Set up the evolution options, which include the number of iterations and a time limit for the evolution process.

7. **Run Evolution:**
   Start the NEAT process by calling the `neat` function, passing all the necessary options and handlers.

8. **Cleanup:**
   After the evolution process is complete, terminate the worker pools to free up resources.

9. **Output:**
   The `neat` function will return the best genome after the evolution process, which you can use for your specific task or further analysis.

Below is a simplified version of the code you need to run in your project:

```ts
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import {
  defaultNEATGenomeOptions,
  neat,
  NEATAlgorithm,
  type NEATReproducerFactory,
} from '@neat-evolution/neat'
import {
  createEvaluator
  type WorkerEvaluator,
} from '@neat-evolution/worker-evaluator'
import {
  createReproducer as createWorkerReproducer,
  type WorkerReproducer,
} from '@neat-evolution/worker-reproducer'
import { hardwareConcurrency } from '@neat-evolution/worker-threads'

const workerThreadLimit = hardwareConcurrency - 1

export const main = async () => {
  // dataset environment
  const datasetOptions = {
    ...defaultDatasetOptions,
    dataset: new URL('./generated/iris', import.meta.url).pathname,
    validationFraction: 0.1,
    testFraction: 0.1,
  }
  const dataset = await loadDataset(datasetOptions)
  const environment = new DatasetEnvironment(dataset)

  const workerPools = new Set<WorkerEvaluator | WorkerReproducer<any>>()

  // bind the reproducer factory to the worker pool
  const createReproducer: NEATReproducerFactory = (
    population
  ) => {
    const reproducer = createWorkerReproducer(population, {
      threadCount: workerThreadLimit,
    })
    workerPools.add(reproducer)
    return reproducer
  }

  // initialize the evaluator pool
  const evaluator = createEvaluator(NEATAlgorithm, environment, {
    createEnvironmentPathname: '@neat-evolution/dataset-environment',
    createExecutorPathname: '@neat-evolution/executor',
    taskCount: 100,
    threadCount: workerThreadLimit,
  })
  workerPools.add(evaluator)

  // configure exit conditions
  const evolutionOptions = {
    ...defaultEvolutionOptions,
    iterations: 5_000,
    secondsLimit: 600,
  }

  // evolve
  const bestGenome = await neat(
    createReproducer,
    evaluator,
    evolutionOptions,
    defaultNEATConfigOptions,
    defaultPopulationOptions,
    undefined,
    defaultNEATGenomeOptions
  )

  // clean up our worker pools
  for (const workerPool of workerPools) {
    await workerPool.terminate()
  }

  return bestGenome
}
```

Copy and paste this boilerplate into your project's main file and adjust the dataset path to point to your own data. Once set up, simply run the main function to kick off the evolution process.

For detailed explanations of each part of the boilerplate, visit our documentation pages. If you encounter any issues or have questions, feel free to open an issue on our GitHub repository.

## Packages Overview
`@neat-evolution` is a collection of modular packages designed to enable and enhance the implementation of various NEAT-based algorithms. To facilitate a better understanding of how these packages can be combined and utilized, we have categorized them according to their primary function within the NEAT framework:

### Core NEAT Algorithms
- `@neat-evolution/neat`: Implements the canonical NeuroEvolution of Augmenting Topologies algorithm.
- `@neat-evolution/hyperneat`: Extends NEAT to evolve large-scale neural networks using an indirect encoding scheme.
- `@neat-evolution/es-hyperneat`: Evolvable Substrate HyperNEAT, focuses on evolving substrates for neural network topology.
- `@neat-evolution/des-hyperneat`: Deep Evolvable Substrate HyperNEAT, a variant for evolving deep neural networks.

### Core Concepts and Configurations
- `@neat-evolution/core`: Defines the foundational genome, link, and node concepts, critical for all NEAT-based algorithms.
- `@neat-evolution/evolution`: Describes populations, species, organisms, and includes the evolution control function.
Environments
- `@neat-evolution/environment`: Outlines the abstract environment concept, essential for neural network execution and evaluation.
- `@neat-evolution/dataset-environment`: Offers a predefined environment for training networks with fixed datasets.

### Execution and Evaluation
- `@neat-evolution/executor`: Provides the default execution mechanism for running neural networks within an environment.
- `@neat-evolution/evaluator`: Contains the evaluator concept for assessing network performance, with a default implementation.

### Worker-Based Parallel Processing
- `@neat-evolution/worker-evaluator`: Enables parallel network evaluation using Web Workers to expedite the evolutionary process.
- `@neat-evolution/worker-reproducer`: Allows for parallel genome reproduction in evolution through Web Workers.
- `@neat-evolution/worker-threads`: Provides a simple cross-platform implementation of worker threads for concurrency.

### Utilities and Extensions
- `@neat-evolution/utils`: Offers shared utility functions that support various NEAT operations.
- `@neat-evolution/cppn`: Implements Compositional Pattern Producing Networks, useful for pattern generation in HyperNEAT extensions.

### Demonstrations and Reference Implementations
- `@neat-evolution/demo`: Provides a replication of the original NEAT demo for reference and educational purposes.

For further details on each package, including specific functionalities, API references, and usage examples, please consult the documentation provided within each package in the repository.
