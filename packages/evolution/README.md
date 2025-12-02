# @neat-evolution/evolution

The `@neat-evolution/evolution` package is responsible for orchestrating the
evolutionary process in NeuroEvolution of Augmenting Topologies (NEAT)
algorithms. It manages populations of organisms, handles speciation, fitness
evaluation, reproduction (crossover and mutation), and the overall progression
of generations to evolve neural networks.

## Purpose

The primary purpose of the `@neat-evolution/evolution` package is to:

- **Manage Populations:** Maintain and evolve a collection of neural networks
  (organisms) over multiple generations.
- **Implement Speciation:** Group similar organisms into species to protect
  innovation and prevent premature convergence.
- **Drive Reproduction:** Facilitate the creation of new generations through
  genetic operations like crossover and mutation.
- **Orchestrate Evolution:** Provide the main loop (`evolve` function) that
  drives the entire evolutionary process, including evaluation, fitness
  adjustment, and population updates.
- **Provide Configurability:** Allow for fine-grained control over the
  evolutionary parameters through `EvolutionOptions` and `PopulationOptions`.

## How it Fits into the Ecosystem

The `evolution` package is a core component that brings together various other
packages to perform neuroevolution:

- **`@neat-evolution/core`**: Organisms and species manage `Genome` instances,
  which are defined in the `core` package. The `distance` method of organisms
  relies on the `genome.distance` from `core`.

- **`@neat-evolution/neat` (and other algorithm packages)**: These packages
  provide the specific `Genome` implementations and `Algorithm` definitions that
  are evolved by this package. The `neat` function (and similar functions in
  other algorithm packages) uses the `evolve` function from this package.

- **`@neat-evolution/evaluator`**: The `Population` class uses an `Evaluator` to
  determine the fitness of each organism's genome.

- **`@neat-evolution/utils`**: Utilizes `threadRNG` for random selections during
  reproduction and population management.

- **`@neat-evolution/worker-reproducer`**: Provides a worker-based
  implementation of the `Reproducer` interface, allowing for parallel
  reproduction.

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
yarn add @neat-evolution/evolution
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/evolution
```

## Key Components

The `evolution` package exposes several important classes, interfaces, and
functions:

- **`Organism<...>`**: Represents an individual neural network within the
  population. It wraps a `Genome` and stores its fitness, adjusted fitness, and
  generation. It provides methods for `crossover`, `mutate`, and `distance`.

- **`Population<...>`**: The central class that manages the collection of
  `Organism`s and `Species`. It handles the overall evolutionary cycle,
  including evaluating organisms, adjusting fitness, calculating offspring, and
  managing speciation. It also provides methods for selecting organisms (e.g.,
  `tournamentSelect`).

- **`Species<...>`**: Groups similar `Organism`s together. It helps in
  preserving genetic diversity and protecting novel innovations. It manages its
  own set of organisms, adjusts their fitness, and calculates the number of
  offspring it should produce.

- **`evolve<P, O>(population: P, options: O)`**: The main asynchronous function
  that drives the evolutionary process. It iteratively evaluates the population,
  applies evolutionary steps (reproduction, speciation), and logs progress until
  a termination condition (iterations, time limit, or early stop) is met.

- **`EvolutionOptions` and `defaultEvolutionOptions`**: Define parameters for
  the overall evolutionary run, such as the number of iterations, time limits,
  logging intervals, and early stopping criteria.

- **`PopulationOptions` and `defaultPopulationOptions`**: Define parameters for
  managing the population, including population size, speciation thresholds,
  fitness sharing, and elite preservation.

- **`Reproducer` and `ReproducerFactory`**: Interfaces and types for creating
  new organisms (offspring) through crossover and mutation. The
  `createReproducer` function (from `reproducer/createReproducer.ts`) provides a
  default implementation.

## Usage

To run an evolutionary simulation, you typically create a `Population` instance
with a specific `Algorithm`, `Evaluator`, and various options, then pass it to
the `evolve` function.

```typescript


import { defaultNEATConfigOptions } from "@neat-evolution/core";
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from "@neat-evolution/dataset-environment";
import { createEvaluator } from "@neat-evolution/evaluator";
import { defaultNEATGenomeOptions, NEATAlgorithm } from "@neat-evolution/neat";

import {
  createReproducer,
  defaultEvolutionOptions,
  defaultPopulationOptions,
  evolve,
} from "@neat-evolution/evolution";

async function runEvolutionExample() {
  // 1. Setup the environment

  const datasetOptions = {
    ...defaultDatasetOptions,
    dataset: "./path/to/your/dataset.txt",
  };

  const dataset = await loadDataset(datasetOptions);

  const environment = new DatasetEnvironment(dataset);

  // 2. Create an evaluator

  const evaluator = createEvaluator(NEATAlgorithm, environment, null);

  // 3. Create a NEAT config (from core)

  const neatConfig = defaultNEATConfigOptions;

  // 4. Create a population

  const population = NEATAlgorithm.createPopulation(
    createReproducer,
    evaluator,
    neatConfig,
    defaultPopulationOptions,
    defaultNEATGenomeOptions,
    environment.description, // Initial network structure
  );

  // 5. Define evolution options

  const evolutionOptions = { ...defaultEvolutionOptions, iterations: 100 };

  // 6. Run the evolution

  const bestOrganism = await evolve(population, evolutionOptions);

  console.log("Evolution finished. Best organism:", bestOrganism);
}

runEvolutionExample();
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
