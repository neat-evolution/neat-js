# @neat-evolution/execution-manager

Runtime execution management for the neat-js ecosystem. Provides factories for
creating execution contexts that coordinate evaluation and training across worker
threads.

## Purpose

The primary purpose of the `@neat-evolution/execution-manager` package is to:

- **Manage Runtime Execution Contexts:** Provide the types and factories needed
  to create execution managers that coordinate genome evaluation and training
  within worker threads.
- **Provide Trainer Factories:** Define the `TrainerFactory` interface for
  creating trainers that perform Lamarckian/backprop training on executors.
- **Coordinate Worker Evaluation Contexts:** Supply `WorkerEvaluationContext`
  with fire-and-forget messaging, RPC calls, Lamarckian writeback scheduling,
  and post-fitness lifecycle hooks.
- **Bridge Evaluation and Training:** Connect evaluation strategies with the
  executor's training capabilities through `EnvironmentRuntimeOptions` and
  `ExecutionManagerFactory`.

## How it Fits into the Ecosystem

The `execution-manager` package sits between the evaluation infrastructure and
the executor layer, providing the runtime plumbing that ties them together.

- **`@neat-evolution/executor`**: Execution managers wrap `Executor` and
  `StaticExecutor` instances. The backprop trainer factory requires a
  `TrainableExecutor` from the executor package to perform forward/backward
  passes.

- **`@neat-evolution/worker-evaluator`**: The worker evaluator populates and
  consumes `WorkerEvaluationContext`, using it to schedule writebacks, send
  messages, and make RPC calls to the main thread.

- **`@neat-evolution/evaluation-strategy`**: Evaluation strategies use the
  execution manager factory to create runtime coordination objects during genome
  evaluation.

- **`@neat-evolution/environment`**: Environments receive
  `EnvironmentInitOptions` containing the execution manager factory and its
  options, allowing them to create execution managers per evaluation.

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
yarn add @neat-evolution/execution-manager
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/execution-manager
```

## Key Components

- **`ExecutionManagerFactory`**:

  A generic factory type that creates an execution manager from an `Executor`,
  factory options, and an optional `PartialEvaluationContext`. This is the main
  extensibility point -- consumers define their own execution manager types and
  wire them in via this factory.

- **`WorkerEvaluationContext`**:

  The evaluation context available inside worker threads. Extends
  `BaseEvaluationContext` (RNG + optional stats) with worker-specific
  capabilities:

  - `send(message)` -- fire-and-forget message to the main thread
  - `call<R>(message)` -- RPC call to the main thread with optional timeout
  - `scheduleWriteback(executor)` -- schedule Lamarckian writeback (idempotent,
    Set semantics; engine flushes once after fitness)
  - `onFitness(callback)` -- register a cleanup callback that fires after
    fitness is decided and writeback is flushed
  - `executorMap` -- read-only map of executor to genome entry for writeback
    correlation

- **`TrainerFactory`**:

  A specialized `ExecutionManagerFactory` that produces `Trainer` instances from
  a `StaticExecutor`. Trainers expose a single `train(data)` method that runs
  supervised training on the executor.

- **`TrainingData`**:

  The shape of training data passed to trainers: parallel arrays of `inputs` and
  `targets` (each `number[]` or `Float64Array`) plus a `count`.

- **`EnvironmentInitOptions`**:

  Options passed to environments at initialization, carrying the execution
  manager factory and its options. Extensible with an index signature for
  hydrated pathnames.

- **`BaseEvaluationContext`** / **`PartialEvaluationContext`**:

  Minimal evaluation context (RNG + optional stats) and its partial-worker
  variant. `PartialEvaluationContext` is `Partial<WorkerEvaluationContext> &
  BaseEvaluationContext`, so it works in both worker and non-worker contexts.

## Backprop Entry Point

The package provides a `./backprop` subpath export containing a ready-made
backprop trainer factory:

```typescript
import { createTrainer } from "@neat-evolution/execution-manager/backprop";
```

`createTrainer` is a `TrainerFactory` that:

1. Validates the executor is a `TrainableExecutor`
2. Accepts `BackpropTrainerFactoryOptions` (`{ learningRate, epochs, isLamarckian? }`)
3. Schedules Lamarckian writeback via the evaluation context (unless
   `isLamarckian` is explicitly `false`)
4. Returns a `Trainer` that runs `epochs` rounds of forward/backward passes over
   the provided `TrainingData`

```typescript
import { createTrainer } from "@neat-evolution/execution-manager/backprop";

const trainer = createTrainer(executor, {
  learningRate: 0.01,
  epochs: 10,
  isLamarckian: true,
}, context);

trainer.train({ inputs, targets, count: inputs.length });
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
