# @neat-evolution/environment

The `@neat-evolution/environment` package defines the fundamental interfaces and types for environments within the `neat-js` ecosystem. An environment represents the problem domain in which a NEAT (NeuroEvolution of Augmenting Topologies) algorithm operates. It provides the necessary context for evaluating the fitness of evolved neural networks (genomes).

## Purpose

The primary purpose of the `@neat-evolution/environment` package is to:

*   **Define the Environment Contract:** Establish a clear interface (`Environment`) that all specific environment implementations must adhere to. This ensures consistency and interoperability across different problem domains.
*   **Abstract Evaluation Logic:** Provide abstract methods for evaluating neural networks, allowing for both synchronous (`evaluate`) and asynchronous (`evaluateAsync`) execution.
*   **Promote Modularity:** Decouple the core NEAT algorithms from the specifics of the problem domain, enabling different environments to be plugged in without modifying the evolutionary core.

## How it Fits into the Ecosystem

The `environment` package serves as a crucial abstraction layer, enabling various NEAT algorithms to be applied to diverse problems. Other packages in the `neat-js` monorepo interact with this package as follows:

*   **`@neat-evolution/evaluator`**: This package consumes `Environment` instances to perform fitness evaluations of genomes.
*   **`@neat-evolution/dataset-environment`**: This package provides a concrete implementation of the `Environment` interface, specifically designed for problems that involve datasets (e.g., classification tasks).
*   **NEAT Algorithms (e.g., `@neat-evolution/neat`, `@neat-evolution/hyperneat`)**: These algorithms rely on an `Environment` to provide feedback on the performance of their evolved neural networks.

## Key Components

The `environment` package exposes the following key types:

*   **`Environment<EFO, E, EA, ER>`**:
    An interface that defines the contract for any environment. It includes:
    *   `description`: An `InitConfig` object that describes the initial configuration of the neural network (e.g., number of inputs and outputs).
    *   `isAsync`: A boolean indicating whether the environment's evaluation is inherently asynchronous.
    *   `evaluate`: A synchronous method for evaluating a neural network, taking an array of `SyncExecutor` and returning a result `ER`.
    *   `evaluateAsync`: An asynchronous method for evaluating a neural network, taking an array of `Executor` and returning a `Promise` of a result `ER`.
    *   `toFactoryOptions`: A method to serialize the environment's options.

*   **`StandardEnvironment<EFO>`**:
    A type alias for a common `Environment` configuration, where evaluation typically involves a single `SyncExecutor` or `Executor` and returns a `number` (e.g., a fitness score).

*   **`EnvironmentFactory<EFO, E, EA, ER>`**:
    A function type that defines how an `Environment` instance is created from a set of options (`EFO`).

*   **`StandardEnvironmentFactory<EFO>`**:
    A type alias for a factory that creates `StandardEnvironment` instances.

## Usage

The `environment` package is primarily used by other packages that need to define or interact with problem domains for NEAT algorithms. You would typically implement the `Environment` interface in a separate package to define a specific problem.

```typescript
import { StandardEnvironment, StandardEnvironmentFactory } from '@neat-evolution/environment';
import { InitConfig } from '@neat-evolution/core';
import { SyncExecutor, Executor } from '@neat-evolution/executor';

// Example of a custom environment implementation (conceptual)
interface MyEnvironmentOptions {
  // ... options specific to MyEnvironment
}

class MyEnvironment implements StandardEnvironment<MyEnvironmentOptions> {
  description: InitConfig = { inputs: 2, outputs: 1 };
  isAsync: boolean = false;

  evaluate(executor: SyncExecutor): number {
    // Implement synchronous evaluation logic here
    // Use the executor to run the neural network
    const output = executor.execute([1, 0]); // Example input
    return output[0]; // Example fitness
  }

  async evaluateAsync(executor: Executor): Promise<number> {
    // Implement asynchronous evaluation logic here
    const output = await executor.execute([1, 0]); // Example input
    return output[0]; // Example fitness
  }

  toFactoryOptions(): MyEnvironmentOptions {
    return {}; // Return options to recreate this environment
  }
}

// Example of an environment factory
const createMyEnvironment: StandardEnvironmentFactory<MyEnvironmentOptions> = (options: MyEnvironmentOptions) => {
  return new MyEnvironment();
};
```
