# @neat-evolution/executor

The `@neat-evolution/executor` package is responsible for the concrete execution
of neural network phenotypes. It provides the interfaces and implementations
necessary to take a neural network's structure (as defined by a `Phenotype` from
`@neat-evolution/core`) and process inputs to produce outputs. This package is
crucial for evaluating the performance of evolved neural networks.

## Purpose

The primary purpose of the `@neat-evolution/executor` package is to:

- **Execute Neural Networks:** Provide a mechanism to run a neural network
  (phenotype) by performing a forward pass with given inputs.
- **Support Synchronous and Asynchronous Execution:** Define interfaces for both
  synchronous (`SyncExecutor`) and asynchronous (`AsyncExecutor`) execution,
  allowing for flexibility in different environments (e.g., main thread vs.
  worker threads).
- **Implement Activation Functions:** Offer a comprehensive set of activation
  functions that can be applied to neural network nodes.
- **Batch Processing:** Enable efficient processing of multiple inputs (batches)
  for performance optimization.

## How it Fits into the Ecosystem

The `executor` package is a fundamental utility that is consumed by evaluators
and other components that need to run neural networks.

- **`@neat-evolution/core`**: Executors operate on `Phenotype` objects, which
  are generated from `Genome`s defined in the `core` package. It also uses the
  `Activation` enum.

- **`@neat-evolution/evaluator`**: Evaluators (e.g., from
  `@neat-evolution/evaluator` or `@neat-evolution/worker-evaluator`) use
  `Executor` instances to run the neural networks and determine their fitness.

- **`@neat-evolution/demo`**: The `demo` package uses `createExecutor` to set up
  the execution of neural networks for demonstration purposes.

## Installation

To install the `@neat-evolution/executor` package, use the following command:

```sh
yarn add @neat-evolution/executor
```

## Key Components

The `executor` package exposes the following key types and functions:

- **`Executor` interface**:

  A union type (`SyncExecutor | AsyncExecutor`) that defines the contract for
  any neural network executor. It includes `isAsync` property and `execute` (for
  single input) and `executeBatch` (for multiple inputs) methods.

- **`SyncExecutor` interface**:

  Defines the contract for synchronous neural network execution, where `execute`
  and `executeBatch` methods return outputs directly.

- **`AsyncExecutor` interface**:

  Defines the contract for asynchronous neural network execution, where
  `execute` and `executeBatch` methods return `Promise`s of outputs.

- **`createExecutor(phenotype: Phenotype): SyncExecutor` function**:

  A factory function that creates a `SyncExecutor` instance from a given
  `Phenotype`. This function implements the forward pass logic, applying
  activation functions and calculating node values.

- **`toActivationFunction(activation: Activation): ActivationFunction`
  function**:

  A utility function that converts an `Activation` enum value (from
  `@neat-evolution/core`) into its corresponding JavaScript activation function
  (e.g., `Activation.Sigmoid` becomes `(x) => 1 / (1 + Math.exp(-x))`).

- **`softmax(arr: number[], inPlace?: boolean): number[]` function**:

  Implements the softmax activation function, typically used for the output
  layer of classification networks to produce a probability distribution.

## Usage

Executors are typically created from a `Phenotype` and then used to process
inputs. In the context of NEAT, the `Phenotype` is derived from the best
`Genome` found by the evolutionary process.

```typescript
import { Activation, Phenotype } from "@neat-evolution/core"; // Assuming Phenotype is available

import { createExecutor, Executor } from "@neat-evolution/executor";


// Example: Create a dummy phenotype (in a real scenario, this comes from a NEAT genome)

const dummyPhenotype: Phenotype = {
  inputs: [0, 1], // Indices of input nodes

  outputs: [2], // Indices of output nodes

  length: 3, // Total number of nodes

  actions: [
    // Example: Link from input 0 to output 2 with weight 0.5

    [0, 0, 2, 0.5], // PhenotypeActionType.Link, fromIndex, toIndex, weight

    // Example: Activation for output node 2 with bias 0 and Sigmoid activation

    [1, 2, 0, Activation.Sigmoid], // PhenotypeActionType.Activation, nodeIndex, bias, activation
  ],
};

// Create an executor from the phenotype

const executor: Executor = createExecutor(dummyPhenotype);

// Provide inputs and get outputs

const inputs = [1.0, 0.5]; // Example inputs

const outputs = executor.execute(inputs);

console.log(`Inputs: ${inputs}`);

console.log(`Outputs: ${outputs}`);

// Example of batch execution

const batchInputs = [
  [1.0, 0.5],

  [0.2, 0.8],
];

const batchOutputs = executor.executeBatch(batchInputs);

console.log(`Batch Inputs: ${JSON.stringify(batchInputs)}`);

console.log(`Batch Outputs: ${JSON.stringify(batchOutputs)}`);
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
