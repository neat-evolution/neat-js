# @neat-evolution/demo

This package provides a comprehensive demonstration of the various NEAT
(NeuroEvolution of Augmenting Topologies) algorithms implemented within the
`neat-js` monorepo. It showcases how different NEAT variations (NEAT, CPPN,
HyperNEAT, ES-HyperNEAT, DES-HyperNEAT) can be applied to a dataset environment,
specifically using the Iris dataset. The demo illustrates both vanilla
(single-threaded) and worker-based (multi-threaded) evaluation strategies.

## Purpose

The primary purpose of the `@neat-evolution/demo` package is to:

- **Illustrate Usage:** Provide concrete examples of how to integrate and
  utilize the core NEAT-related packages.
- **Compare Algorithms:** Allow for easy switching and comparison between
  different NEAT algorithms.
- **Demonstrate Evaluation Strategies:** Showcase both synchronous and
  asynchronous (worker-based) evaluation methods.
- **Serve as a Reference:** Act as a working example for developers looking to
  implement their own NEAT-based solutions using the `neat-js` ecosystem.

## How it Fits into the Ecosystem

The `demo` package acts as an orchestrator, bringing together several key
packages from the `neat-js` monorepo:

- **`@neat-evolution/core`**: Provides fundamental NEAT configuration options.
- **`@neat-evolution/cppn`**: Used for the CPPN algorithm demonstration.
- **`@neat-evolution/dataset-environment`**: Manages the dataset (e.g., Iris)
  used for training and evaluation.
- **`@neat-evolution/des-hyperneat`**: Demonstrates the DES-HyperNEAT algorithm.
- **`@neat-evolution/es-hyperneat`**: Demonstrates the ES-HyperNEAT algorithm.
- **`@neat-evolution/evaluator`**: Provides the base evaluator interface.
- **`@neat-evolution/evolution`**: Manages the evolutionary process, including
  population and reproduction.
- **`@neat-evolution/hyperneat`**: Demonstrates the HyperNEAT algorithm.
- **`@neat-evolution/neat`**: Demonstrates the foundational NEAT algorithm.
- **`@neat-evolution/executor`**: Used by the vanilla evaluator for executing
  tasks.
- **`@neat-evolution/worker-evaluator`**: Provides a multi-threaded evaluator
  for improved performance.
- **`@neat-evolution/worker-reproducer`**: Provides a multi-threaded reproducer.
- **`@neat-evolution/worker-threads`**: Utilized for managing worker threads.

## Installation

To install the `@neat-evolution/demo` package, use the following command:

```sh
yarn add @neat-evolution/demo
```

This package also requires several peer dependencies to function correctly.
Ensure you have installed the necessary `@neat-evolution` packages as described
in the main repository `README.md`.

## Usage

The `demo` package is primarily designed for demonstration and testing purposes.
It's not intended for direct consumption as a library in typical applications,
but rather as a reference for how to build your own NEAT-powered solutions.

### Running the Demo

The demo can be run in two main modes:

1. **Vanilla (Single-threaded) Evaluation:** This mode uses a single thread for
   evaluation.

   ```sh
   node path/to/node_modules/@neat-evolution/demo/dist/esm/vanilla.js
   ```

2. **Worker (Multi-threaded) Evaluation:** This mode leverages worker threads
   for parallel evaluation, which can significantly speed up the evolutionary
   process for complex tasks.

   ```sh
   node path/to/node_modules/@neat-evolution/demo/dist/esm/worker.js
   ```

### Customizing the Demo

The `demo.ts` file allows you to switch between different NEAT algorithms by
modifying the `method` export. For example, to run the NEAT algorithm:

```typescript
export const method = Methods.NEAT; // Change from Methods.DES_HyperNEAT
```

You can also adjust `evolutionOptions` and `datasetOptions` within `demo.ts` to
experiment with different parameters for the evolutionary process and dataset
handling.

## Example Code Structure

The core logic resides in `demo.ts`, which orchestrates the chosen NEAT
algorithm with a specified environment and evaluation strategy.

- **`demo.ts`**: Contains the main `demo` function that sets up the environment,
  evolution options, and calls the appropriate NEAT algorithm based on the
  `method` variable. It imports and utilizes various components from other
  `@neat-evolution` packages.
- **`vanilla.ts`**: Sets up a single-threaded evaluator and reproducer, then
  calls the `demo` function.
- **`worker.ts`**: Configures a multi-threaded evaluator and reproducer using
  `worker-evaluator` and `worker-reproducer`, then calls the `demo` function. It
  also handles the termination of worker threads.

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
