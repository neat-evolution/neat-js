# @neat-evolution/worker-reproducer

The `@neat-evolution/worker-reproducer` package provides a multi-threaded
implementation of the `Reproducer` interface, leveraging web workers (or Node.js
worker threads) to parallelize the genetic operations (crossover and mutation)
involved in creating new generations of organisms. This significantly speeds up
the evolutionary process, especially for large populations or complex genomes.

## Purpose

The primary purpose of the `@neat-evolution/worker-reproducer` package is to:

- **Parallelize Reproduction:** Distribute the tasks of breeding and mutating
  organisms across several worker threads, reducing the total time required for
  each evolutionary generation.
- **Improve Performance:** Enhance the overall performance of NEAT algorithms by
  offloading heavy genetic computations from the main thread.
- **Implement `Reproducer`:** Provide a concrete, high-performance
  implementation of the `Reproducer` interface defined in
  `@neat-evolution/evolution`.
- **Manage Worker Communication:** Handle the complex logistics of spawning
  workers, sending genetic tasks, and receiving new organisms back from them.

## How it Fits into the Ecosystem

The `worker-reproducer` package is a specialized and performance-oriented
implementation of the generic `reproducer` concept. It integrates with other
packages in the `neat-js` monorepo as follows:

- **`@neat-evolution/evolution`**: Implements the `Reproducer` interface,
  fulfilling the contract for creating new organisms. The `evolve` function uses
  a `Reproducer` to generate the next generation.

- **`@neat-evolution/worker-actions`**: Uses the `Dispatcher` and `WorkerAction`
  primitives to manage type-safe communication with worker threads.

- **`@neat-evolution/worker-threads`**: Utilizes the `Worker` abstraction from
  this package to create and manage worker threads.

- **`@neat-evolution/core` (and algorithm packages like `neat`, `cppn`, etc.)**:
  The `WorkerReproducer` needs to know which algorithm's genomes it will be
  reproducing, and the path to the algorithm's module is provided.

- **`@neat-evolution/demo`**: The `demo` package uses `createReproducerFactory`
  to demonstrate multi-threaded reproduction.

## Installation

To install the `@neat-evolution/worker-reproducer` package, use the following
command:

```sh
yarn add @neat-evolution/worker-reproducer
```

This package also requires several peer dependencies to function correctly.
Ensure you have installed the necessary `@neat-evolution` packages as described
in the main repository `README.md`.

## Key Components

The `worker-reproducer` package exposes several important classes, interfaces,
and functions:

- **`WorkerReproducer` class**:

  The main class that implements the `Reproducer` interface. It manages a pool
  of worker threads, distributes reproduction tasks (copying elites, breeding
  organisms) among them, and collects the results. It uses a `Dispatcher` from
  `@neat-evolution/worker-actions` to handle communication and a semaphore to
  control the number of concurrent tasks.

- **`WorkerReproducerOptions` interface and `defaultWorkerReproducerOptions`**:

  Defines configurable parameters for the `WorkerReproducer`, such as the number
  of worker threads (`threadCount`), and whether to enable custom state handling
  (`enableCustomState`).

- **`createReproducer(...)` and `createReproducerFactory(...)` functions**:

  Factory functions for creating `WorkerReproducer` instances.
  `createReproducerFactory` is a higher-order function that returns a
  `ReproducerFactory` suitable for use with the `evolution` package.

- **`workerReproducerScript.ts`**:

  This file contains the entry point code that runs inside each worker thread.
  It sets up message listeners to handle initialization requests, reproduction
  tasks, and other commands from the main thread.

- **`WorkerAction.ts`**:

  Defines the types of actions (messages) exchanged between the main thread and
  worker threads, enabling structured communication for tasks and results.

- **`WorkerCustomState.ts` and `WorkerState.ts`**:

  These modules are involved in managing the state of the reproduction process
  within workers, potentially including custom state for specialized algorithms
  like DES-HyperNEAT.

## Usage

To use the `worker-reproducer`, you typically create a reproducer factory and
then use it to instantiate a `Reproducer` for your population. This `Reproducer`
is then passed to the `evolve` function from `@neat-evolution/evolution`.

```typescript



import { defaultNEATConfigOptions } from "@neat-evolution/core";
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from "@neat-evolution/dataset-environment";
import { createEvaluator } from "@neat-evolution/evaluator";
import {
  defaultPopulationOptions,
  Population,
} from "@neat-evolution/evolution"; // Example Population
import { NEATAlgorithm } from "@neat-evolution/neat"; // Example algorithm
import { hardwareConcurrency } from "@neat-evolution/worker-threads";

import {
  createReproducerFactory,
  WorkerReproducerOptions,
} from "@neat-evolution/worker-reproducer";

async function setupWorkerReproducer() {
  // 1. Setup the environment

  const datasetOptions = {
    ...defaultDatasetOptions,
    dataset: "./path/to/your/dataset.txt",
  };

  const dataset = await loadDataset(datasetOptions);

  const environment = new DatasetEnvironment(dataset);

  // 2. Create an evaluator (can be a worker evaluator too)

  const evaluator = createEvaluator(NEATAlgorithm, environment, null);

  // 3. Define worker reproducer options

  const workerReproducerOptions: WorkerReproducerOptions = {
    algorithmPathname: "@neat-evolution/neat", // Path to the algorithm module

    threadCount: hardwareConcurrency - 1, // Use all but one CPU core for workers

    enableCustomState: false, // Set to true if using algorithms with custom state (e.g., DES-HyperNEAT)
  };

  // 4. Create the reproducer factory

  const createReproducer = createReproducerFactory(
    workerReproducerOptions,
    new Set(),
  );

  // 5. Create a dummy population (in a real scenario, this would be part of the evolution process)

  const population = new Population(
    createReproducer,
    evaluator,
    NEATAlgorithm,
    defaultNEATConfigOptions,
    defaultPopulationOptions,
    NEATAlgorithm.defaultOptions,
    environment.description,
  );

  // The reproducer would then be used by the evolution process:

  // await population.reproduce(speciesIds);

  // Don't forget to terminate workers when done

  // await (population.reproducer as any).terminate(); // Assuming reproducer has a terminate method
}

setupWorkerReproducer();
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.

