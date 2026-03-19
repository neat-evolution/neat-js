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
- **Train Neural Networks:** Provide backpropagation-based training via
  `createTrainableExecutor`.
- **Support Lamarckian Evolution:** Enable gradient-based weight updates that
  can be written back to genomes via `WritebackPayload`.
- **Gradient Chaining:** Support CPPN gradient chaining for HyperNEAT variants
  via `accumulateBackward` and `applyGradients`.
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
  `Activation` enum. Trainable executors use `WritebackPayload` for writing
  trained weights back to genomes, and read `trainableBiases` and
  `chainBackward` from the phenotype. Algorithms call `writeBackWeights` with
  the payload from `getUpdatedActions()`.

- **`@neat-evolution/evaluator`**: Evaluators (e.g., from
  `@neat-evolution/evaluator` or `@neat-evolution/worker-evaluator`) use
  `Executor` instances to run the neural networks and determine their fitness.

- **`@neat-evolution/demo`**: The `demo` package uses `createExecutor` to set up
  the execution of neural networks for demonstration purposes.

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
yarn add @neat-evolution/executor
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/executor
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

- **`createTrainableExecutor(phenotype): TrainableExecutor` function**:

  Creates a trainable executor that supports backpropagation. Compiles the
  phenotype into optimized typed arrays. Respects `phenotype.trainableBiases`
  (default `true`) to control whether biases are updated during training.

- **`TrainableExecutor` interface**:

  Extends `StaticExecutor` with training methods:

  - `forward(inputs)` — forward pass, returns `Float64Array`
  - `backward(outputErrors, learningRate)` — full backward pass: zeros
    gradients, computes, applies, chains to CPPN
  - `accumulateBackward(outputErrors)` — accumulate gradients without updating
    (for multi-coordinate CPPN chaining)
  - `applyGradients(learningRate)` — apply accumulated gradients
  - `zeroGradients()` — zero the accumulator
  - `getUpdatedActions(): WritebackPayload` — extract trained weights/biases
    for writeback. Calls `transformWriteback` if available (HyperNEAT).
  - `getWeightGradients()` — access raw gradients
  - `createSnapshot(): StaticExecutor` — freeze current weights/biases as an
    immutable executor

- **`StaticExecutor` interface**:

  Immutable executor with `forward()` and `forwardBatch()`. Created by
  `createSnapshot()`.

## Backprop Entry Point

The package exports backprop features separately via
`@neat-evolution/executor/backprop`:

```typescript
import { createTrainableExecutor } from "@neat-evolution/executor/backprop";
```

Or from the main entry:

```typescript
import { createTrainableExecutor } from "@neat-evolution/executor";
```

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

### Backprop Training

```typescript
import { createTrainableExecutor } from "@neat-evolution/executor";

// Create a trainable executor from a phenotype
const executor = createTrainableExecutor(phenotype);

// Training loop
for (const { input, target } of trainingData) {
  const output = executor.forward(input);
  const error = new Float64Array(output.length);
  for (let i = 0; i < output.length; i++) {
    error[i] = output[i] - target[i];
  }
  executor.backward(error, 0.01); // learning rate
}

// Extract trained weights for writeback to genome
const payload = executor.getUpdatedActions();
algorithm.writeBackWeights(genome, payload);
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
