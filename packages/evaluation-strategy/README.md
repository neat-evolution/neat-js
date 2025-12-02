# @neat-evolution/evaluation-strategy

This package provides pluggable evaluation strategies for orchestrating genome fitness evaluation in the `@neat-evolution` project. It defines the `EvaluationStrategy` and `EvaluationContext` interfaces, along with built-in strategy implementations.

## Purpose

Separates evaluation **orchestration** (how genomes are evaluated) from evaluation **execution** (worker pool management). This promotes modularity, flexibility, and testability:

- **Strategies** determine the evaluation pattern (individual, batch, tournament)
- **Context** provides low-level operations (evaluate single genome, evaluate batch)
- **Evaluators** manage worker pools and provide context to strategies

## Interfaces

### `EvaluationContext`

Provides strategies with access to worker pool operations for genome evaluation:

```typescript
export interface EvaluationContext {
  /**
   * Evaluates a single genome entry using the worker pool
   * @param genomeEntry - Genome to evaluate
   * @returns Promise resolving to fitness data
   */
  evaluateGenomeEntry(genomeEntry: GenomeEntry<any>): Promise<FitnessData>

  /**
   * Evaluates a batch of genome entries together (critical for tournaments)
   * @param genomeEntries - Array of genomes to evaluate together
   * @returns Promise resolving to array of fitness data
   */
  evaluateGenomeEntryBatch(
    genomeEntries: Array<GenomeEntry<any>>
  ): Promise<FitnessData[]>
}
```

### `EvaluationStrategy`

Defines the contract for evaluation orchestration patterns:

```typescript
export interface EvaluationStrategy {
  /**
   * Orchestrates evaluation of genome entries using provided context
   * @param context - Evaluation context with worker pool operations
   * @param genomeEntries - Genomes to evaluate
   * @returns Async iterable of fitness data as results complete
   */
  evaluate(
    context: EvaluationContext,
    genomeEntries: GenomeEntries<any>
  ): AsyncIterable<FitnessData>
}
```

## Built-in Strategies

### `IndividualStrategy`

Evaluates each genome independently, yielding results as they complete. This is the default strategy used by `WorkerEvaluator`.

**Behavior**:
- Creates evaluation promises for all genomes
- Yields results in completion order (not input order)
- Maximizes parallelism across worker pool

**Usage**:
```typescript
import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'

const strategy = new IndividualStrategy()
// Pass to evaluator via options.strategy
```

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

```bash
yarn add @neat-evolution/evaluation-strategy
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @neat-evolution/evaluation-strategy
```

## Usage

### Using Built-in Strategies

Pass a strategy to `WorkerEvaluator` via options:

```typescript
import { createWorkerEvaluator } from '@neat-evolution/worker-evaluator'

import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'

const evaluator = createWorkerEvaluator(algorithm, environment, {
  createEnvironmentPathname: '@neat-evolution/dataset-environment',
  createExecutorPathname: '@neat-evolution/executor',
  taskCount: 100,
  threadCount: 4,
  strategy: new IndividualStrategy(), // Optional - this is the default
})
```

### Creating Custom Strategies

Implement the `EvaluationStrategy` interface:

```typescript
import type { GenomeEntries, FitnessData } from '@neat-evolution/evaluator'

import type {
  EvaluationStrategy,
  EvaluationContext,
} from '@neat-evolution/evaluation-strategy'

class BatchStrategy implements EvaluationStrategy {
  constructor(private batchSize: number = 10) {}

  async *evaluate(
    context: EvaluationContext,
    genomeEntries: GenomeEntries<any>
  ): AsyncIterable<FitnessData> {
    const entries = Array.from(genomeEntries)

    // Process in batches
    for (let i = 0; i < entries.length; i += this.batchSize) {
      const batch = entries.slice(i, i + this.batchSize)
      const results = await context.evaluateGenomeEntryBatch(batch)
      for (const result of results) {
        yield result
      }
    }
  }
}

// Usage:
// const strategy = new BatchStrategy(20)
// const evaluator = createWorkerEvaluator(algorithm, environment, { strategy, ... })
```

### Strategy vs Context Responsibilities

**Strategy** (orchestration):
- Determines order and grouping of evaluations
- Controls when to use individual vs batch evaluation
- Implements specific patterns (tournament, coevolution, etc.)

**Context** (execution):
- Manages worker pool and semaphore
- Handles message passing to/from workers
- Provides primitives for evaluation operations

## Development

To build this package:

```bash
yarn workspace @neat-evolution/evaluation-strategy build
```

To run tests:

```bash
yarn workspace @neat-evolution/evaluation-strategy test
```
