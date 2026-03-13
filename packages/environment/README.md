# @neat-evolution/environment

The `@neat-evolution/environment` package defines the fundamental interfaces and
types for environments within the `neat-js` ecosystem. An environment represents
the problem domain in which a NEAT (NeuroEvolution of Augmenting Topologies)
algorithm operates. It provides the necessary context for evaluating the fitness
of evolved neural networks (genomes).

## Purpose

The primary purpose of the `@neat-evolution/environment` package is to:

- **Define the Environment Contract:** Establish a clear interface
  (`Environment`) that all specific environment implementations must adhere to.
  This ensures consistency and interoperability across different problem
  domains.
- **Abstract Evaluation Logic:** Provide abstract methods for evaluating neural
  networks, allowing for both synchronous (`evaluate`, `evaluateBatch`) and asynchronous
  (`evaluateAsync`, `evaluateBatchAsync`) execution of single or multiple genomes.
- **Promote Modularity:** Decouple the core NEAT algorithms from the specifics
  of the problem domain, enabling different environments to be plugged in
  without modifying the evolutionary core.

## How it Fits into the Ecosystem

The `environment` package serves as a crucial abstraction layer, enabling
various NEAT algorithms to be applied to diverse problems. Other packages in the
`neat-js` monorepo interact with this package as follows:

- **`@neat-evolution/evaluator`**: This package consumes `Environment` instances
  to perform fitness evaluations of genomes.
- **`@neat-evolution/dataset-environment`**: This package provides a concrete
  implementation of the `Environment` interface, specifically designed for
  problems that involve datasets (e.g., classification tasks).
- **NEAT Algorithms (e.g., `@neat-evolution/neat`,
  `@neat-evolution/hyperneat`)**: These algorithms rely on an `Environment` to
  provide feedback on the performance of their evolved neural networks.

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
yarn add @neat-evolution/environment
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/environment
```

## Key Components

The `environment` package exposes the following key types:

### Core Evaluation

- **`Environment<EFO>`**: The contract for any environment. Includes:
  - `description`: An `InitConfig` describing the neural network shape (inputs, outputs).
  - `evaluate`: Synchronous evaluation of a single `SyncExecutor`, returning a fitness score.
  - `evaluateAsync`: Asynchronous single-executor evaluation.
  - `evaluateBatch` / `evaluateBatchAsync`: Batch evaluation for tournaments or parallel runs.
  - `toFactoryOptions`: Serialization for worker reconstruction.

- **`EnvironmentFactory<EFO>`**: A function type for creating `Environment` instances from serialized options.

### RL Interfaces

These interfaces extend the base environment contract for reinforcement learning:

- **`EpisodicEnvironment`**: Environments that support episodic RL implement this alongside `Environment`. Provides `getRLConfig()` returning `RLConfig` (action size, discount factor, max steps, suggested rollout length).

- **`AgentEnvironment`**: Environments that support direct agent evaluation. Exposes `evaluateAgent(agent: EpisodicAgent): number` so RL plugins can pass trained agents (AC or QL) directly, bypassing the executor pipeline.

- **`EpisodicAgent`**: The generic RL agent interface. Methods: `act(inputs)`, `reward(reward, done)`, `startEpisode(info)`, `endEpisode(result)`. All RL methods (AC, QL) implement this.

- **`EpisodeInfo`**: Episode start metadata including `episodeIndex`, optional `type` (e.g., `'scenario'`, `'full-game'`), `phase`, and `metadata`.

- **`EpisodeResult`**: Episode completion data including `fitness` (per-episode evolutionary contribution), `episodeReturn` (cumulative reward for RL), `totalSteps`, `terminated`, and optional `metadata`.

- **`EpisodicContext`**: Plugin-provided hooks (`reward`, `episodeStart`, `episodeEnd`, `transitionInfo`) that environments call during evaluation. These are supplemental signals; they do not replace the direct `evaluateAgent()` contract.

- **`TransitionInfo`**: Per-transition metadata (`eventLabel`, `tags`, `isInteresting`, `situationClass`, `metadata`) emitted by the environment for agent capture decisions. Metadata describes transitions but does not carry reward semantics.

### Signal Boundaries

| Signal | Scope | Consumed by |
| --- | --- | --- |
| **Reward** | Single transition | RL agent (TD targets, advantages) |
| **Episode return** (`EpisodeResult.episodeReturn`) | Single episode | RL agent + telemetry |
| **Fitness** (`EpisodeResult.fitness`, `evaluate()` return) | Full evaluation | Evolution (selection) |

## Usage

The `environment` package is primarily used by other packages that need to
define or interact with problem domains for NEAT algorithms. You would typically
implement the `Environment` interface in a separate package to define a specific
problem.

```typescript
import { InitConfig } from "@neat-evolution/core";
import { Executor, SyncExecutor } from "@neat-evolution/executor";

import {
  Environment,
  EnvironmentFactory,
} from "@neat-evolution/environment";

// Example of a custom environment implementation (conceptual)
interface MyEnvironmentOptions {
  // ... options specific to MyEnvironment
}

class MyEnvironment implements Environment<MyEnvironmentOptions> {
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

  evaluateBatch(executors: SyncExecutor[]): number[] {
    // Implement synchronous batch evaluation logic here
    return executors.map((executor) => executor.execute([1, 0])[0]);
  }

  async evaluateBatchAsync(executors: Executor[]): Promise<number[]> {
    // Implement asynchronous batch evaluation logic here
    const results = await Promise.all(
      executors.map((executor) => executor.execute([1, 0])),
    );
    return results.map((output) => output[0]);
  }

  toFactoryOptions(): MyEnvironmentOptions {
    return {}; // Return options to recreate this environment
  }
}

// Example of an environment factory
const createMyEnvironment: EnvironmentFactory<MyEnvironmentOptions> = (
  options: MyEnvironmentOptions,
) => {
  return new MyEnvironment();
};
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
