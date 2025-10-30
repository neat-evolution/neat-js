# @neat-evolution: Evolving Neural Networks in TypeScript

## Introduction

Welcome to `@neat-evolution`, a TypeScript library offering a modular
implementation of the NEAT (NeuroEvolution of Augmenting Topologies) algorithm
and its advanced variants, including HyperNEAT, ES-HyperNEAT, and DES-HyperNEAT.

Born from the translation of a Rust reference implementation, `@neat-evolution`
bridges the gap between the robustness of Rust and the flexibility of
TypeScript. It enables the evolution and execution of neural networks directly
within both browser and Node.js environments. This project adheres to a monorepo
structure that encapsulates a suite of packages, each tailored to specific
aspects of neural network evolution and execution.

### Why `@neat-evolution`?

- **TypeScript**: Embrace the full power of TypeScript's static typing and
  modern syntax to build and evolve neural networks with confidence and clarity.
- **Browser & Node.js**: Run neural networks client-side or on the server,
  providing versatility for web applications and server-side solutions alike.
- **Monorepo**: A carefully structured monorepo ensures that all the moving
  parts of NEAT and its extensions are easily accessible and maintainable.

The core of NEAT's philosophy is to mimic natural evolution, introducing
concepts from biology such as genomes, species, and mutations to optimize neural
networks. By employing a genetic algorithm, `@neat-evolution` evolves a
population of organisms over time, dynamically growing complexity and adapting
structures to solve tasks ranging from simple XOR problems to controlling
complex robotic systems.

Whether you're an academic, hobbyist, or professional developer,
`@neat-evolution` provides the tools to experiment with and deploy
neuroevolution strategies. Step into the world of evolvable neural topologies
with `@neat-evolution` and discover the power of evolutionary algorithms for
neural network training.

## Installation

`@neat-evolution` is a highly modular and flexible library designed for the
implementation of NeuroEvolution of Augmenting Topologies (NEAT) algorithms. It
allows users to easily evolve neural networks for a variety of tasks.

### Quick Start

To quickly set up a basic NEAT environment, install the following core packages:

```sh
npm install @neat-evolution/core @neat-evolution/dataset-environment @neat-evolution/neat @neat-evolution/worker-evaluator @neat-evolution/executor @neat-evolution/worker-reproducer
```

Or, if you're using Yarn:

```sh
yarn add @neat-evolution/core @neat-evolution/dataset-environment @neat-evolution/neat @neat-evolution/worker-evaluator @neat-evolution/executor @neat-evolution/worker-reproducer
```

These packages provide the necessary components to begin creating and evolving
neural networks:

- `@neat-evolution/core`: The fundamental neural network structures.
- `@neat-evolution/dataset-environment`: A default environment to train your
  networks.
- `@neat-evolution/neat`: The primary NEAT algorithm implementation.
- `@neat-evolution/worker-evaluator`: A parallelized evaluation system using web
  workers.
- `@neat-evolution/executor`: Executes neural networks and produces results.
- `@neat-evolution/worker-reproducer`: A web worker-based system for
  parallelized genetic operations.

### Customization Options

`@neat-evolution` offers a variety of packages for those who wish to tailor the
library to their needs. You can choose different algorithms, executors,
evaluators, or even build your own environment for a custom solution.

#### Implementing Custom Environments

To use a custom environment, install it alongside the core packages:

```sh
npm install @your-custom-environment
```

#### Choosing Alternative Algorithms

If you prefer a different flavor of the NEAT algorithm, you can install one of
the alternatives:

```sh
npm install @neat-evolution/neat           # NEAT algorithm
npm install @neat-evolution/cppn           # Compositional Pattern Producing Network
npm install @neat-evolution/hyperneat      # HyperNEAT algorithm
npm install @neat-evolution/es-hyperneat   # Evolvable Substrate HyperNEAT
npm install @neat-evolution/des-hyperneat  # Deep Evolvable Substrate HyperNEAT
```

## Getting Started with a Demo

For a complete, runnable example of how to set up and run a NEAT evolution
experiment, please refer to the
[`@neat-evolution/demo`](./packages/demo/README.md) package. The demo showcases
how to integrate various `@neat-evolution` packages to evolve a neural network
within a dataset environment, utilizing worker pools for parallel execution.

## Packages Overview

`@neat-evolution` is a collection of modular packages designed to enable and
enhance the implementation of various NEAT-based algorithms. To facilitate a
better understanding of how these packages can be combined and utilized, we have
categorized them according to their primary function within the NEAT framework:

### Core NEAT Algorithms

- **`@neat-evolution/neat`**: Implements the canonical NeuroEvolution of
  Augmenting Topologies algorithm. It provides the core genetic operations,
  speciation, and evolutionary loop for evolving neural network topologies and
  weights.
- **`@neat-evolution/cppn`**: Implements Compositional Pattern Producing
  Networks (CPPNs), an extension of NEAT where activation functions and biases
  can be evolved. CPPNs are often used as indirect encodings for HyperNEAT.
- **`@neat-evolution/hyperneat`**: Implements the HyperNEAT algorithm, which
  uses CPPNs to evolve the connectivity patterns of a larger, fixed-topology
  neural network called a "substrate."
- **`@neat-evolution/es-hyperneat`**: Implements ES-HyperNEAT (Evolving
  Substrates HyperNEAT), an advanced variant of HyperNEAT that dynamically
  generates the substrate's connections through a divide-and-conquer search
  mechanism.
- **`@neat-evolution/des-hyperneat`**: Implements DES-HyperNEAT (Dynamic
  Evolving Substrates HyperNEAT), a highly specialized variant that allows for
  the evolution of both the CPPN and the substrate's topology and depth,
  enabling highly flexible network architectures.

### Foundational Components

- **`@neat-evolution/core`**: The foundational layer defining essential
  interfaces and types for genomes, nodes, links, configurations, and core
  genetic operations. It provides the building blocks for all NEAT-based
  algorithms.
- **`@neat-evolution/utils`**: A collection of general-purpose utility
  functions, including random number generation, array shuffling, and binary
  search, used across the monorepo.
- **`@neat-evolution/environment`**: Defines the abstract interface for
  environments, representing the problem domain in which NEAT algorithms operate
  and providing context for fitness evaluation.
- **`@neat-evolution/dataset-environment`**: A concrete implementation of the
  `Environment` interface, specifically designed for dataset-driven problems. It
  handles loading, splitting, and evaluating datasets for supervised learning
  tasks.
- **`@neat-evolution/evolution`**: Manages the overall evolutionary process,
  including population management, speciation, fitness adjustment, and
  reproduction (crossover and mutation) across generations.

### Execution and Evaluation

- **`@neat-evolution/executor`**: Provides the concrete implementation for
  executing neural network phenotypes (forward pass) and includes various
  activation functions. It defines interfaces for both synchronous and
  asynchronous execution.
- **`@neat-evolution/evaluator`**: Defines the core interface for evaluators,
  which are responsible for assessing the fitness of evolved neural networks by
  running them against a specified environment.

### Worker-Based Parallel Processing

- **`@neat-evolution/worker-threads`**: Provides a cross-environment abstraction
  layer for JavaScript worker threads, offering a unified API for
  multi-threading in both Node.js and browser environments.
- **`@neat-evolution/worker-evaluator`**: A multi-threaded implementation of the
  `Evaluator` interface, leveraging worker threads to parallelize genome fitness
  evaluation for improved performance.
- **`@neat-evolution/worker-reproducer`**: A multi-threaded implementation of
  the `Reproducer` interface, utilizing worker threads to parallelize genetic
  operations (crossover and mutation) for efficient organism reproduction.

For further details on each package, including specific functionalities, API
references, and usage examples, please consult the documentation provided within
each package in the repository.
