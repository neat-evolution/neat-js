# @neat-evolution/stats

The `@neat-evolution/stats` package provides statistical utilities and a
lightweight recording system for collecting structured metrics during evolution
runs. It includes aggregation functions, loss functions, and composable
recorders for capturing and routing metric data.

## Purpose

The primary purpose of the `@neat-evolution/stats` package is to:

- **Provide Aggregation Functions:** Offer common statistical operations (mean,
  median, variance, summary statistics, group-by) for analyzing fitness data and
  other numeric series.
- **Provide Loss Functions:** Include standard loss functions (MSE, cross-entropy)
  for evaluating model performance in RL and supervised learning contexts.
- **Enable Metric Recording:** Supply a composable recorder system for capturing
  structured data (generation records, run summaries) emitted by the evolution
  loop via the `StatsSink` interface.

## How it Fits into the Ecosystem

The `stats` package is a utility library consumed by packages that need
statistical analysis or metric collection:

- **`@neat-evolution/evolution`**: Defines the `StatsSink` interface (in its own
  `records/` module, with no dependency on this package) and emits `generation`
  and `run-summary` records to any sink passed via `EvolutionOptions.stats`.
- **Consumer applications**: Use recorders from this package to capture, store,
  or analyze the metrics emitted by the evolution loop.

The `StatsSink` interface in `@neat-evolution/evolution` and the `StatsRecorder`
interface in this package are structurally identical — both define `wants()` and
`record()`. They are separate to avoid a circular dependency: evolution defines
its own minimal interface so it never depends on this package.

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
yarn add @neat-evolution/stats
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/stats
```

## Key Components

### Recorders

- **`createCallbackRecorder(handlers)`**: Creates a recorder that dispatches
  each metric to a handler function. Only records metrics that have registered
  handlers.

- **`createMemoryRecorder(subscriptions)`**: Creates a recorder that stores
  metric values in memory, keyed by metric name. Useful for testing and
  post-run analysis. Includes `get<T>(metric)` and `clear()` methods.

- **`createFanoutRecorder(children)`**: Creates a recorder that broadcasts each
  metric to multiple child recorders. Only forwards to children that `wants()`
  the metric.

### Aggregation

- **`mean(values)`**: Arithmetic mean.
- **`median(values)`**: Median value.
- **`variance(values)`**: Population variance.
- **`summary(values)`**: Returns min, max, mean, median, variance, and count.
- **`groupBy(items, keyFn)`**: Groups items by a key function into a `Map`.

### Loss Functions

- **`mse(predicted, actual)`**: Mean squared error.
- **`crossEntropy(predicted, actual)`**: Cross-entropy loss.

### Types

- **`StatsRecorder`**: Interface with `wants(metric)` and
  `record(metric, value)` methods. Structurally compatible with `StatsSink`
  from `@neat-evolution/evolution`.

## Usage

### Collecting Metrics from Evolution

```typescript
import { createMemoryRecorder } from "@neat-evolution/stats";
import type { GenerationRecord } from "@neat-evolution/evolution";

// Create a recorder that captures generation and run-summary data
const recorder = createMemoryRecorder(["generation", "run-summary"]);

// Pass to evolution via EvolutionOptions or EvolutionManagerOptions
const manager = new EvolutionManager({
  // ...
  evaluation: {
    stats: recorder,
  },
});

await manager.evolve();

// Retrieve captured data
const generations = recorder.get<GenerationRecord>("generation");
console.log(`Ran ${generations.length} generations`);
console.log(`Best fitness: ${generations.at(-1)?.bestFitness}`);
```

### Fanout to Multiple Recorders

```typescript
import {
  createCallbackRecorder,
  createFanoutRecorder,
  createMemoryRecorder,
} from "@neat-evolution/stats";

const memory = createMemoryRecorder(["generation"]);
const logger = createCallbackRecorder({
  generation(_metric, value) {
    console.log("Generation recorded:", value);
  },
});

const combined = createFanoutRecorder([memory, logger]);
// Pass `combined` as the stats sink
```

### Statistical Analysis

```typescript
import { mean, median, summary } from "@neat-evolution/stats";

const fitnessValues = [0.2, 0.5, 0.8, 0.3, 0.9];

console.log(mean(fitnessValues)); // 0.54
console.log(median(fitnessValues)); // 0.5
console.log(summary(fitnessValues));
// { min: 0.2, max: 0.9, mean: 0.54, median: 0.5, variance: ..., count: 5 }
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
