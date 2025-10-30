# @neat-evolution/worker-threads

The `@neat-evolution/worker-threads` package provides a cross-environment
abstraction layer for JavaScript worker threads. It aims to offer a unified API
for utilizing multi-threading capabilities, whether in a Node.js environment
(using `worker_threads`) or a web browser environment (using Web Workers). This
abstraction simplifies the development of multi-threaded applications by hiding
the underlying platform-specific implementations.

## Purpose

The primary purpose of the `@neat-evolution/worker-threads` package is to:

- **Provide Cross-Environment Compatibility:** Offer a single, consistent API
  for working with worker threads across both Node.js and browser environments.
- **Simplify Multi-threading:** Abstract away the complexities and differences
  between Node.js `worker_threads` and Web Workers, making it easier for
  developers to implement parallel processing.
- **Support Performance-Critical Operations:** Enable other packages in the
  `neat-js` monorepo (like `worker-evaluator` and `worker-reproducer`) to
  leverage multi-threading for computationally intensive tasks, thereby
  improving overall performance.
- **Encapsulate Platform-Specific Logic:** Centralize the platform-specific
  implementations of worker threads, allowing the rest of the codebase to remain
  platform-agnostic.

## How it Fits into the Ecosystem

The `worker-threads` package is a foundational utility for any package in the
`neat-js` monorepo that requires multi-threading capabilities. It is directly
consumed by:

- **`@neat-evolution/worker-evaluator`**: Uses this package to create and manage
  worker threads for parallel genome evaluation.

- **`@neat-evolution/worker-reproducer`**: Uses this package to create and
  manage worker threads for parallel genetic operations (crossover and
  mutation).

- **`@neat-evolution/demo`**: The `demo` package utilizes `hardwareConcurrency`
  from this package to determine the optimal number of worker threads to use.

## Installation

To install the `@neat-evolution/worker-threads` package, use the following
command:

```sh
yarn add @neat-evolution/worker-threads
```

## Key Components

The `worker-threads` package exposes the following key types and functions:

- **`Worker` class**:

  A unified `Worker` class that provides a consistent interface for creating,
  communicating with, and terminating worker threads, regardless of the
  underlying JavaScript environment.

  It mimics the standard Web Worker API.

- **`workerContext`**:

  An object (or set of functions) that provides access to environment-specific
  worker functionalities (e.g., `postMessage`, `onmessage`, `onmessageerror`,
  `on` for Node.js, `addEventListener` for browser).

- **`hardwareConcurrency`**:

  A function or constant that returns the number of logical CPU cores available,
  which is useful for determining the optimal number of worker threads to spawn.

- **`WorkerOptions` interface**:

  Defines common options for configuring a worker, such as `name` and `type`
  (for Web Workers), and extends `NodeWorkerOptions` for Node.js specific
  settings.

- **`EventTypes.ts`, `MessageEvent.ts`, `MessageListenerFn.ts`**:

  These files define the types for events, message events, and message listener
  functions, ensuring type safety and consistency across the abstraction.

- **`node.ts` and `browser.ts`**:

  These files contain the platform-specific implementations of the `Worker`
  class, `workerContext`, and `hardwareConcurrency` for Node.js and browser
  environments, respectively.

## Usage

Other packages in the `neat-js` monorepo import and use the `Worker` class and
`hardwareConcurrency` from this package to implement multi-threaded logic. The
abstraction ensures that the consuming code does not need to differentiate
between Node.js and browser environments.

```typescript
import { hardwareConcurrency, Worker } from "@neat-evolution/worker-threads";

// Determine the number of available CPU cores

const numThreads = hardwareConcurrency - 1; // Use all but one core

console.log(`Using ${numThreads} worker threads.`);

// Example of creating a worker (the path would point to your worker script)

const worker = new Worker(new URL("./my-worker-script.js", import.meta.url), {
  type: "module",

  name: "MyWorker",
});

// Listen for messages from the worker

worker.addEventListener("message", (event) => {
  console.log("Message from worker:", event.data);
});

// Send a message to the worker

worker.postMessage({ command: "start", data: [1, 2, 3] });

// Handle errors from the worker

worker.addEventListener("error", (error) => {
  console.error("Worker error:", error);
});

// Terminate the worker when no longer needed

// worker.terminate();
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
