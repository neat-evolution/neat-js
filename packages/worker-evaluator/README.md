# @neat-evolution/worker-evaluator

Evaluates Genomes in a worker. Works in the browser using Web Workers and in
Node using Worker Threads. This is a drop-in replacement for `AsyncEvaluator`
and is a significant performance boost in most real-world settings.

```sh
yarn add @neat-evolution/worker-evaluator
```

## Usage

This package is designed to be cross platform because the Web Worker API is not
identical to the Node Worker Threads API. To support both it provides
conditional exports and path exports.

### Conditional Exports

If you import the package directly you should get the correct implementation for
your environment. Even if you are using a bundler like Vite this should work.
The conditional imports will choose the correct implementation based on how they
are imported.

```ts
// Automatically choose between node and browser implementations
import { createEvaluator } from "@neat-evolution/worker-evaluator";
```

### Browser only

If you know you want the browser implementation (or you are having issues) you
can import it directly. This version uses Web Workers.

```ts
// Only use the browser implementation
import { createEvaluator } from "@neat-evolution/worker-evaluator/browser";
```

### Node only

If you know you want the Node implementation you can import it directly. This
version uses Node Worker Threads.

```ts
// Only use the node implementation
import { createEvaluator } from "@neat-evolution/worker-evaluator/node";
```

## Example

This is a kitchen sink example adapted from the demo.

The important parts:

1. Look up the number of CPUs in your environment
2. Provide packages or paths for createEnvironment and createExecutor
3. Create a worker evaluator

Everything else is the normal, required boilerplate.

```ts
import os from "node:os";

import { defaultNEATConfigOptions } from "@neat-evolution/core";
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from "@neat-evolution/dataset-environment";
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
} from "@neat-evolution/evolution";
import { defaultNEATGenomeOptions, neat } from "@neat-evolution/neat";

import { createEvaluator } from "@neat-evolution/worker-evaluator";

const datasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL("../../generated/iris", import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1,
};

const dataset = await loadDataset(datasetOptions);
const environment = new DatasetEnvironment(dataset);

// 1. Look up the number of CPUs in your environment
// Node
const workerThreadLimit = os.cpus().length - 1;

// Browser
// const workerThreadLimit = window.navigator.hardwareConcurrency

// 2. Provide packages for createEnvironment and createExecutor
const evaluatorOptions = {
  createEnvironmentPathname: "@neat-evolution/dataset-environment",
  createExecutorPathname: "@neat-evolution/executor",
  taskCount: defaultPopulationOptions.populationSize,
  threadCount: workerThreadLimit,
};

// 3. Create a worker evaluator
const evaluator = createEvaluator(environment, evaluatorOptions);

const evolutionOptions: EvolutionOptions = {
  ...defaultEvolutionOptions,
  iterations: 500,
  secondsLimit: 60,
};

const genome = await neat(
  evaluator,
  evolutionOptions,
  defaultNEATConfigOptions,
  defaultPopulationOptions,
  defaultNEATGenomeOptions,
);
```
