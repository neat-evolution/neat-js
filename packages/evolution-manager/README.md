# @neat-evolution/evolution-manager

The `@neat-evolution/evolution-manager` package provides a high-level
orchestrator that ties together algorithm selection, environment configuration,
population management, evaluation, and execution into a single cohesive API. It
removes the need to manually wire up evaluators, reproducers, and worker pools.

## Purpose

- **Simplify Setup:** Configure an entire evolutionary run through a single
  `EvolutionManagerOptions` object instead of manually constructing each
  component.
- **Register Built-in Algorithms:** Reference algorithms by name (`'NEAT'`,
  `'HyperNEAT'`, etc.) without importing their classes directly.
- **Manage Lifecycle:** Handle worker creation, population initialization,
  evolution, and teardown through `init()`, `evolve()`, and `terminate()`.
- **Support Serialization:** Save and restore population state via
  `getPopulationData()` and `createOrganism()`.

## How it Fits into the Ecosystem

The `evolution-manager` package sits above the core evolution machinery and
coordinates the other packages:

- **`@neat-evolution/evolution`**: Provides `Population`, `Organism`, `evolve`,
  and reproduction primitives that the manager orchestrates.
- **`@neat-evolution/core`**: Defines `Genome`, `Algorithm`, and
  `WritebackPayload` interfaces that the manager consumes.
- **`@neat-evolution/neat`, `@neat-evolution/cppn`, `@neat-evolution/hyperneat`,
  `@neat-evolution/es-hyperneat`, `@neat-evolution/des-hyperneat`**: Algorithm
  packages registered as built-in algorithms.
- **`@neat-evolution/worker-evaluator`**: The manager creates worker-based
  evaluators for parallel fitness evaluation.
- **`@neat-evolution/worker-reproducer`**: The manager creates worker-based
  reproducers for parallel offspring generation.
- **`@neat-evolution/executor`**: Used to convert organisms into executors for
  inference.

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
yarn add @neat-evolution/evolution-manager
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/evolution-manager
```

## Key Components

- **`EvolutionManager`**: The main class. Accepts an `EvolutionManagerOptions`
  config, creates worker evaluators and reproducers, manages the population, and
  runs the evolution loop. Key methods: `init()`, `initializePopulation()`,
  `evolve()`, `terminate()`, `getBestExecutor()`, `getPopulationData()`, and
  `createOrganism()`.

- **`EvolutionManagerOptions`** / **`NormalizedEvolutionManagerConfig`**: The
  input configuration and its resolved form. Groups settings into sections:
  `algorithm`, `environment`, `population`, `evolution`, `evaluation`, and
  `execution`.

- **`builtInAlgorithms`**: A registry of all built-in algorithm definitions.
  Use `getBuiltInEvolutionAlgorithmDefinition(name)` to look up an algorithm by
  name. Helpers like `createBuiltInExecutorFromSerializedGenome()` allow
  hydrating saved genomes without manual algorithm setup.

## Usage

```typescript
import { EvolutionManager } from "@neat-evolution/evolution-manager";

// Create a manager with a built-in algorithm
const manager = new EvolutionManager({
  algorithm: {
    name: "NEAT",
    genomeOptions: {
      activationFunction: "sigmoid",
    },
  },
  environment: {
    config: myEnvironment,
    pathname: "./my-environment.js",
  },
  population: {
    options: { populationSize: 150 },
  },
  evolution: {
    iterations: 100,
  },
  evaluation: {
    options: { threadCount: 4 },
  },
});

// Run evolution
const bestOrganism = await manager.evolve();

// Get an executor for inference
const executor = manager.getBestExecutor();
const output = executor.execute([1, 0]);

// Clean up workers
await manager.terminate();
```

## Built-in Algorithms

The following algorithms are registered and can be referenced by name in the
`algorithm.name` field:

| Name              | Algorithm Class         | Uses CPPN Activations |
| ----------------- | ----------------------- | --------------------- |
| `'NEAT'`          | `NEATAlgorithm`         | No                    |
| `'CPPN'`          | `CPPNAlgorithm`         | Yes                   |
| `'HyperNEAT'`    | `HyperNEATAlgorithm`    | Yes                   |
| `'ES-HyperNEAT'` | `ESHyperNEATAlgorithm`  | Yes                   |
| `'DES-HyperNEAT'`| `DESHyperNEATAlgorithm` | Yes                   |

You can also pass a custom `algorithm` instance or `definition` directly instead
of using a built-in name.

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
