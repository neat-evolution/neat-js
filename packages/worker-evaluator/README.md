# @neat-evolution/worker-evaluator

The `@neat-evolution/worker-evaluator` package provides a multi-threaded
implementation of the `Evaluator` interface, leveraging web workers (or Node.js
worker threads) to parallelize the fitness evaluation of neural network genomes.
This significantly speeds up the evolutionary process, especially for
computationally intensive tasks or large populations.

## Purpose

The primary purpose of the `@neat-evolution/worker-evaluator` package is to:

- **Parallelize Evaluation:** Distribute the task of evaluating multiple genomes
  across several worker threads, reducing the total time required for each
  evolutionary generation.
- **Improve Performance:** Enhance the overall performance of NEAT algorithms by
  offloading heavy computation from the main thread.
- **Implement `Evaluator`:** Provide a concrete, high-performance
  implementation of the `Evaluator` interface defined in
  `@neat-evolution/evaluator`, integrating pluggable evaluation strategies.
- **Manage Worker Communication:** Handle the complex logistics of spawning
  workers, sending evaluation tasks, and receiving fitness results back from
  them.

## How it Fits into the Ecosystem

The `worker-evaluator` package is a specialized and performance-oriented
implementation of the generic `evaluator` concept. It integrates with other
packages in the `neat-js` monorepo as follows:

- **`@neat-evolution/evaluator`**: Implements the `StandardEvaluator` interface,
  fulfilling the contract for genome evaluation.

- **`@neat-evolution/worker-actions`**: Uses the `Dispatcher` and `WorkerAction`
  primitives to manage type-safe communication with worker threads.

- **`@neat-evolution/worker-threads`**: Utilizes the `Worker` abstraction from
  this package to create and manage worker threads.

- **`@neat-evolution/environment`**: The `WorkerEvaluator` requires an
  `Environment` to provide the problem context. The environment data is
  serialized and sent to the workers.

- **`@neat-evolution/executor`**: Workers need an `Executor` to run the neural
  networks. The path to the `createExecutor` function is passed to the workers.

- **`@neat-evolution/core` (and algorithm packages like `neat`, `cppn`, etc.)**:
  The `WorkerEvaluator` needs to know which algorithm's genomes it will be
  evaluating, and the path to the algorithm's module is provided.

- **`@neat-evolution/demo`**: The `demo` package uses `createWorkerEvaluator` to
  demonstrate multi-threaded evaluation.

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
yarn add @neat-evolution/worker-evaluator
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/worker-evaluator
```

This package also requires several peer dependencies to function correctly.
Ensure you have installed the necessary `@neat-evolution` packages as described
in the main repository `README.md`.

## Key Components

The `worker-evaluator` package exposes several important classes, interfaces,
and functions:

- **`WorkerEvaluator` class**:

  The main class that implements the `Evaluator` interface. It manages a
  pool of worker threads, distributes genome evaluation tasks among them, and
  collects the results. It uses a `Dispatcher` from `@neat-evolution/worker-actions`
  to handle communication and a semaphore to control the number of concurrent
  tasks.

- **`WorkerEvaluatorOptions` interface**:

  Defines configurable parameters for the `WorkerEvaluator`, such as the number
  of worker threads (`threadCount`), the total number of tasks (`taskCount`),
  the pathnames to the algorithm, environment creation, and executor
  creation modules (essential for workers to initialize their own contexts),
  and an optional evaluation `strategy` for customizing evaluation orchestration.

- **`createEvaluator(...)` function**:

  A factory function that creates a `WorkerEvaluator` instance. It takes an
  `AnyAlgorithm`, an `Environment`, and `WorkerEvaluatorOptions` to
  configure and instantiate the multi-threaded evaluator.

- **`workerEvaluatorScript.ts`**:

  This file contains the entry point code that runs inside each worker thread.
  It sets up message listeners to handle initialization requests, genome
  evaluation requests, and other commands from the main thread.

- **Message Handling (`message/ActionMessage.ts`,
  `message/createActionMessage.ts`)**:

  These files define the structure of messages exchanged between the main thread
  and worker threads, enabling structured communication for tasks and results.

- **Worker-side Handlers (`worker/handleEvaluateGenome.ts`,
  `worker/handleInitGenomeFactory.ts`, `worker/handleInitEvaluator.ts`)**:

  These modules contain the logic executed within the worker threads to perform
  specific tasks, such as evaluating a genome or initializing the genome
  factory.

## Evaluation Strategy Pattern

The `WorkerEvaluator` uses a pluggable strategy pattern to separate evaluation **orchestration** from **execution**:

- **Strategy**: Determines HOW genomes are evaluated (individually, in batches, tournaments)
- **Context**: Provides low-level operations exposed to strategies (`evaluateGenomeEntry`, `evaluateGenomeEntryBatch`)
- **WorkerEvaluator**: Manages worker pool and provides context to strategy

### Default Behavior

By default, `WorkerEvaluator` uses `IndividualStrategy` which evaluates each genome independently:

```typescript
import { createEvaluator } from '@neat-evolution/worker-evaluator'

// Uses IndividualStrategy by default
const evaluator = createEvaluator(algorithm, environment, {
  createEnvironmentPathname: '@neat-evolution/dataset-environment',
  createExecutorPathname: '@neat-evolution/executor',
  taskCount: 100,
  threadCount: 4,
})
```

### Custom Strategies

Pass a custom strategy via options to change evaluation behavior:

```typescript
import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'

import { createEvaluator } from '@neat-evolution/worker-evaluator'

const strategy = new IndividualStrategy()

const evaluator = createEvaluator(algorithm, environment, {
  createEnvironmentPathname: '@neat-evolution/dataset-environment',
  createExecutorPathname: '@neat-evolution/executor',
  taskCount: 100,
  threadCount: 4,
  strategy, // Explicit strategy (optional)
})
```

See `@neat-evolution/evaluation-strategy` for creating custom strategies and `@neat-evolution/demo` for reference implementation.

## Usage

To use the `worker-evaluator`, you typically create an instance of it with the
appropriate options and then pass it to the evolutionary process. The
`WorkerEvaluator` will then handle the parallel evaluation of genomes.

```typescript

import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from "@neat-evolution/dataset-environment";
import { IndividualStrategy } from "@neat-evolution/evaluation-strategy"; // Import IndividualStrategy
import { NEATAlgorithm } from "@neat-evolution/neat"; // Example algorithm
import { hardwareConcurrency } from "@neat-evolution/worker-threads";

import {
  createEvaluator,
  WorkerEvaluatorOptions,
} from "@neat-evolution/worker-evaluator";

async function setupWorkerEvaluator() {
  // 1. Setup the environment

  const datasetOptions = {
    ...defaultDatasetOptions,
    dataset: "./path/to/your/dataset.txt",
  };

  const dataset = await loadDataset(datasetOptions);

  const environment = new DatasetEnvironment(dataset);

  // 2. Define worker evaluator options

  const workerEvaluatorOptions: WorkerEvaluatorOptions = {
    algorithmPathname: "@neat-evolution/neat", // Path to the algorithm module

    createEnvironmentPathname: "@neat-evolution/dataset-environment", // Path to createEnvironment function

    createExecutorPathname: "@neat-evolution/executor", // Path to createExecutor function

    taskCount: 100, // Total number of evaluation tasks

    threadCount: hardwareConcurrency - 1, // Use all but one CPU core for workers

    strategy: new IndividualStrategy(), // Explicitly pass the IndividualStrategy
  };

  // 3. Create the worker evaluator

  const workerEvaluator = createEvaluator(
    NEATAlgorithm, // The algorithm whose genomes will be evaluated
    environment, // The environment to evaluate against
    workerEvaluatorOptions,
  );

  console.log("Worker Evaluator created:", workerEvaluator);

  // The workerEvaluator would then be used by the evolution process:

  // await workerEvaluator.initGenomeFactory(...);

  // for await (const fitnessData of workerEvaluator.evaluate(genomeEntries)) { ... }

  // Don't forget to terminate workers when done

  // await workerEvaluator.terminate();
}

setupWorkerEvaluator();
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
