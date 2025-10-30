# @neat-evolution/evaluator

The `@neat-evolution/evaluator` package defines the core interfaces and provides a factory for creating evaluators within the `neat-js` ecosystem. An evaluator is responsible for assessing the fitness of evolved neural networks (genomes) by running them against a specified environment. This package acts as a crucial bridge between the evolutionary algorithms and the problem domain.

## Purpose

The primary purpose of the `@neat-evolution/evaluator` package is to:

*   **Define Evaluation Contract:** Establish a clear `Evaluator` interface that all specific evaluator implementations must adhere to, ensuring consistency.
*   **Abstract Fitness Calculation:** Provide a standardized mechanism for calculating and returning fitness scores for genomes.
*   **Integrate with Environments:** Work in conjunction with `Environment` instances (from `@neat-evolution/environment`) to provide the context for genome evaluation.
*   **Support Different Execution Models:** Allow for both synchronous and asynchronous execution of neural networks, accommodating various performance requirements (e.g., single-threaded vs. worker-based).

## How it Fits into the Ecosystem

The `evaluator` package is a critical component that is consumed by the `evolution` package and implemented by specialized evaluators (like `worker-evaluator`).

*   **`@neat-evolution/core`**: Evaluators work with `Genome` objects, which are defined in the `core` package.
*   **`@neat-evolution/environment`**: An `Evaluator` requires an `Environment` to provide the problem context and define how genomes are to be evaluated.
*   **`@neat-evolution/evolution`**: The `Population` class in the `evolution` package uses an `Evaluator` to determine the fitness of its organisms during each generation.
*   **`@neat-evolution/executor`**: Evaluators utilize `Executor` instances to run the neural networks (phenotypes) derived from genomes.
*   **`@neat-evolution/worker-evaluator`**: This package provides a concrete, multi-threaded implementation of the `Evaluator` interface, leveraging web workers for parallel evaluation.
*   **`@neat-evolution/demo`**: The `demo` package uses `createEvaluator` to set up the evaluation process for its various NEAT algorithm demonstrations.

## Key Components

The `evaluator` package exposes the following key types and functions:

*   **`Evaluator<E, EA, ER>` interface**:
    The core interface for any evaluator. It includes:
    *   `environment`: The `Environment` instance against which genomes are evaluated.
    *   `initGenomeFactory`: An asynchronous method to initialize the genome factory within the evaluator, providing necessary configuration.
    *   `evaluate`: An asynchronous iterable method that takes `GenomeEntries` (a collection of genomes with their species and organism indices) and yields `FitnessData` (species index, organism index, and calculated fitness).

*   **`StandardEvaluator` type**:
    A type alias for a common `Evaluator` configuration, where evaluation typically involves a single `SyncExecutor` or `Executor` and returns a `number` (the fitness score).

*   **`GenomeEntry<G>` and `GenomeEntries<G>`**:
    Types that define how genomes are passed to the evaluator, including their associated species and organism indices.

*   **`FitnessData` type**:
    Defines the structure of the data returned by the evaluator after assessing a genome's fitness.

*   **`createEvaluator(...)` function**:
    A factory function that creates a `StandardEvaluator` instance. It takes an `Algorithm`, an `Environment`, and an `ExecutorFactory` to construct the evaluator. Currently, it uses a `TestEvaluator` as its underlying implementation.

*   **`TestEvaluator` class**:
    A basic implementation of the `Evaluator` interface, primarily used for testing and demonstration purposes. It directly uses the provided `Executor` to evaluate genomes.

## Usage

Evaluators are typically created by the main evolutionary process (e.g., the `neat` function in `@neat-evolution/neat`) and then passed to the `evolve` function from `@neat-evolution/evolution`.

```typescript
import { createEvaluator, StandardEvaluator } from '@neat-evolution/evaluator';
import { NEATAlgorithm } from '@neat-evolution/neat'; // Example algorithm
import { DatasetEnvironment, loadDataset, defaultDatasetOptions } from '@neat-evolution/dataset-environment';
import { createExecutor } from '@neat-evolution/executor'; // Example executor factory

async function setupEvaluator() {
  // 1. Setup the environment
  const datasetOptions = { ...defaultDatasetOptions, dataset: './path/to/your/dataset.txt' };
  const dataset = await loadDataset(datasetOptions);
  const environment = new DatasetEnvironment(dataset);

  // 2. Create an evaluator
  const evaluator: StandardEvaluator = createEvaluator(
    NEATAlgorithm, // The algorithm whose genomes will be evaluated
    environment,   // The environment to evaluate against
    createExecutor // A factory to create executors for running phenotypes
  );

  console.log('Evaluator created:', evaluator);

  // The evaluator would then be used by the evolution process:
  // await evaluator.initGenomeFactory(...);
  // for await (const fitnessData of evaluator.evaluate(genomeEntries)) { ... }
}

setupEvaluator();
```

