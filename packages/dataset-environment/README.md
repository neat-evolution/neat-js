# @neat-evolution/dataset-environment

The `@neat-evolution/dataset-environment` package provides a concrete
implementation of the `Environment` interface from
`@neat-evolution/environment`, specifically designed for problems that involve
datasets. It handles the loading, parsing, splitting, and evaluation of
datasets, making it easy to apply NEAT algorithms to supervised learning tasks
like classification and regression.

## Purpose

The primary purpose of the `@neat-evolution/dataset-environment` package is to:

- **Simplify Dataset Integration:** Provide a streamlined way to load and
  prepare datasets for use with NEAT algorithms.
- **Manage Data Splitting:** Automatically split datasets into training,
  validation, and test sets based on configurable fractions.
- **Facilitate Fitness Evaluation:** Offer a robust mechanism for calculating
  the fitness of evolved neural networks against the loaded dataset, including
  support for classification and regression metrics.
- **Support Worker-based Evaluation:** Provide utilities for transferring
  dataset information efficiently to worker threads using `SharedArrayBuffer`.

## How it Fits into the Ecosystem

This package is a specialized environment provider within the `neat-js`
ecosystem. It builds upon the `environment` and `core` packages and is utilized
by the `demo` package to showcase NEAT algorithms on a real-world dataset.

- **`@neat-evolution/environment`**: Implements the `StandardEnvironment`
  interface defined in this package.
- **`@neat-evolution/core`**: Uses `InitConfig` for defining dataset dimensions.
- **`@neat-evolution/utils`**: Leverages `createRNG` and `shuffle` for dataset
  preparation (e.g., shuffling data).
- **`@neat-evolution/demo`**: Utilizes `DatasetEnvironment` to run various NEAT
  algorithms on the Iris dataset.
- **`@neat-evolution/worker-evaluator`**: Can use the `createEnvironment`
  factory to reconstruct the environment in worker threads from a
  `SharedArrayBuffer`.

## Key Components

The `dataset-environment` package exposes several important components:

- **`Dataset` interface**: Defines the structure of a loaded dataset, including
  input and target arrays for training, validation, and testing, along with
  metadata like dimensions and whether it's a classification task.

- **`DatasetOptions` interface and `defaultDatasetOptions`**: `DatasetOptions`
  defines configurable parameters for loading a dataset (e.g., file path, seed
  for shuffling, split fractions, bias input). `defaultDatasetOptions` provides
  a standard set of these parameters.

- **`loadDataset(config: DatasetOptions): Promise<Dataset>`**: An asynchronous
  function responsible for reading a dataset from a specified file path, parsing
  its content, and splitting it into training, validation, and test sets. It
  also handles shuffling and adding a bias input if configured.

- **`DatasetEnvironment` class**: The core environment implementation. It takes
  a `Dataset` object and provides `evaluate` and `evaluateAsync` methods to
  calculate the fitness of a neural network based on its performance on the
  dataset. It supports both mean squared error (MSE) for regression and
  cross-entropy for classification.

- **`createEnvironment(environmentData: SharedArrayBuffer | null): DatasetEnvironment`**:
  A factory function used to reconstruct a `DatasetEnvironment` instance from a
  `SharedArrayBuffer`. This is particularly useful for passing environment data
  to worker threads without serialization overhead.

- **Accuracy Functions (`oneHotAccuracy`, `roundedAccuracy`,
  `binaryAccuracy`)**: Utility functions for calculating different types of
  accuracy metrics, primarily used for classification tasks.

- **`datasetToSharedBuffer` and `datasetFromSharedBuffer`**: Functions for
  serializing a `Dataset` object into a `SharedArrayBuffer` and deserializing it
  back, enabling efficient data transfer between the main thread and worker
  threads.

## How it Fits into the Ecosystem

This package is a specialized environment provider within the `neat-js`
ecosystem. It builds upon the `environment` and `core` packages and is utilized
by the `demo` package to showcase NEAT algorithms on a real-world dataset.

- **`@neat-evolution/environment`**: Implements the `StandardEnvironment`
  interface defined in this package.
- **`@neat-evolution/core`**: Uses `InitConfig` for defining dataset dimensions.
- **`@neat-evolution/utils`**: Leverages `createRNG` and `shuffle` for dataset
  preparation (e.g., shuffling data).
- **`@neat-evolution/demo`**: Utilizes `DatasetEnvironment` to run various NEAT
  algorithms on the Iris dataset.
- **`@neat-evolution/worker-evaluator`**: Can use the `createEnvironment`
  factory to reconstruct the environment in worker threads from a
  `SharedArrayBuffer`.

## Installation

To install the `@neat-evolution/dataset-environment` package, use the following
command:

```sh
yarn add @neat-evolution/dataset-environment
```

## Key Components

The `dataset-environment` package exposes several important components:

- **`Dataset` interface**: Defines the structure of a loaded dataset, including
  input and target arrays for training, validation, and testing, along with
  metadata like dimensions and whether it's a classification task.

- **`DatasetOptions` interface and `defaultDatasetOptions`**: `DatasetOptions`
  defines configurable parameters for loading a dataset (e.g., file path, seed
  for shuffling, split fractions, bias input). `defaultDatasetOptions` provides
  a standard set of these parameters.

- **`loadDataset(config: DatasetOptions): Promise<Dataset>`**: An asynchronous
  function responsible for reading a dataset from a specified file path, parsing
  its content, and splitting it into training, validation, and test sets. It
  also handles shuffling and adding a bias input if configured.

- **`DatasetEnvironment` class**: The core environment implementation. It takes
  a `Dataset` object and provides `evaluate` and `evaluateAsync` methods to
  calculate the fitness of a neural network based on its performance on the
  dataset. It supports both mean squared error (MSE) for regression and
  cross-entropy for classification.

- **`createEnvironment(environmentData: SharedArrayBuffer | null): DatasetEnvironment`**:
  A factory function used to reconstruct a `DatasetEnvironment` instance from a
  `SharedArrayBuffer`. This is particularly useful for passing environment data
  to worker threads without serialization overhead.

- **Accuracy Functions (`oneHotAccuracy`, `roundedAccuracy`,
  `binaryAccuracy`)**: Utility functions for calculating different types of
  accuracy metrics, primarily used for classification tasks.

- **`datasetToSharedBuffer` and `datasetFromSharedBuffer`**: Functions for
  serializing a `Dataset` object into a `SharedArrayBuffer` and deserializing it
  back, enabling efficient data transfer between the main thread and worker
  threads.

## Usage

To use the `dataset-environment` package, you typically start by defining your
`DatasetOptions` and then loading your dataset. You can then create a
`DatasetEnvironment` instance to evaluate your NEAT genomes.

```typescript
import { createExecutor } from "@neat-evolution/executor"; // Assuming an executor is available

import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from "@neat-evolution/dataset-environment";

async function runDatasetDemo() {
  // Configure dataset options
  const datasetOptions = { ...defaultDatasetOptions };
  datasetOptions.dataset = "./path/to/your/dataset.txt"; // Specify your dataset file
  datasetOptions.validationFraction = 0.1;
  datasetOptions.testFraction = 0.1;

  // Load the dataset
  const dataset = await loadDataset(datasetOptions);

  // Create a DatasetEnvironment
  const environment = new DatasetEnvironment(dataset);

  // Example: Evaluate a dummy executor (in a real scenario, this would be a NEAT genome's phenotype)
  const dummyExecutor = createExecutor(); // Replace with your actual executor
  const fitness = environment.evaluate(dummyExecutor);
  console.log(`Evaluated fitness: ${fitness}`);

  // For worker threads, you would pass environment.toFactoryOptions() (a SharedArrayBuffer)
  // to the worker, and the worker would use createEnvironment to reconstruct it.
}

runDatasetDemo();
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
