# @neat-evolution/utils

The `@neat-evolution/utils` package provides a collection of general-purpose
utility functions designed to support various operations across the `neat-js`
monorepo. These utilities include functionalities for random number generation,
array manipulation (like shuffling), and efficient searching (binary search).

## Purpose

The primary purpose of the `@neat-evolution/utils` package is to:

- **Centralize Common Functionality:** Provide a single, reusable location for
  utility functions that are frequently needed by other packages.
- **Improve Code Readability and Maintainability:** By abstracting common
  operations into well-defined functions, the package helps to reduce code
  duplication and makes the codebase easier to understand and maintain.
- **Support Core Algorithms:** Offer essential tools for algorithms that rely on
  randomness, array processing, or efficient data retrieval.

## How it Fits into the Ecosystem

The `utils` package is a foundational dependency for several other packages
within the `neat-js` monorepo, particularly those involved in evolutionary
processes and data handling.

- **`@neat-evolution/core`**: Utilizes `threadRNG` for various mutation
  operations and `binarySearchFirst` for efficient searching within genetic
  distance calculations.
- **`@neat-evolution/evolution`**: Employs `shuffle` for randomizing populations
  and `threadRNG` for probabilistic selections during the evolutionary process.
- **`@neat-evolution/dataset-environment`**: Uses `shuffle` for randomizing
  dataset entries during preparation and `createRNG` for reproducible data
  splitting.

By providing these common utilities, `@neat-evolution/utils` helps to ensure
consistency and efficiency across the entire `neat-js` ecosystem.

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
yarn add @neat-evolution/utils
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/utils
```

## Key Components

The `utils` package exposes the following key functions and interfaces:

- **`binarySearchFirst<T>(arr: T[], val: T): number`**: A function that performs
  a binary search on a sorted array `arr` to find the first occurrence of `val`.
  It returns the index of the value if found, or the index where the value
  should be inserted to maintain sorted order. This function is inspired by
  Rust's `Vec::binary_search`.

- **`RNG` interface**: Defines the contract for a random number generator,
  including methods like `gen()` (to generate a random number between 0 and 1),
  `genRange(min, max)` (to generate a random integer within a specified range),
  and `genBool()` (to generate a random boolean).

- **`createRNG(seed?: string): RNG`**: A factory function that creates an `RNG`
  instance. It can be optionally seeded for reproducible random number
  sequences.

- **`threadRNG(): RNG`**: A function that returns a global, thread-safe random
  number generator instance. This is a crude port of Rust's `rand` crate's
  `thread_rng` function.

- **`shuffle<T>(array: T[], rng: RNG): T[]`**: Implements the Durstenfeld
  algorithm (a variation of the Fisher-Yates algorithm) to shuffle an array
  `array` in place. It requires an `RNG` instance for generating random numbers
  during the shuffling process.

## Usage

The functions in `@neat-evolution/utils` are designed to be imported and used
directly by other packages.

```typescript
import { binarySearchFirst, shuffle, threadRNG } from "@neat-evolution/utils";

// Get a random number generator
const rng = threadRNG();

// Generate a random number
const randomNumber = rng.gen();
console.log(`Random number: ${randomNumber}`);

// Generate a random number within a range
const randomInRange = rng.genRange(1, 10); // Between 1 (inclusive) and 10 (exclusive)
console.log(`Random number in range: ${randomInRange}`);

// Shuffle an array
const myArray = [1, 2, 3, 4, 5];
shuffle(myArray, rng);
console.log(`Shuffled array: ${myArray}`); // Output: e.g., [3, 1, 5, 2, 4]

// Perform a binary search
const sortedArray = [10, 20, 30, 40, 50];
const index = binarySearchFirst(sortedArray, 35);
console.log(`Insert index for 35: ${index}`); // Output: 3 (index where 35 would be inserted)
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
