# @neat-evolution/worker-pool

The `@neat-evolution/worker-pool` package provides a generic, efficient worker pool implementation for managing a collection of worker threads. It leverages `async-sema` to handle concurrency limits and ensure that tasks are distributed effectively across available workers.

## Purpose

The primary purpose of the `@neat-evolution/worker-pool` package is to:

- **Manage Worker Lifecycle:** Handle the creation, initialization, and termination of worker threads.
- **Control Concurrency:** Limit the number of concurrent tasks to match the number of available workers or a specified limit, preventing system overload.
- **Resource Management:** Efficiently acquire and release workers, ensuring they are reused rather than constantly recreated.

## How it Fits into the Ecosystem

The `worker-pool` package is a low-level utility used by higher-level packages to manage parallelism.

- **`@neat-evolution/worker-actions`**: This package relies on `WorkerPool` to manage the workers it communicates with. The `Dispatcher` class takes a `WorkerPool` instance in its constructor.
- **`@neat-evolution/worker-evaluator`**: Uses `WorkerPool` internally (via `worker-actions` or directly) to manage a pool of workers for parallel genome evaluation.
- **`@neat-evolution/worker-reproducer`**: Uses `WorkerPool` internally to manage a pool of workers for parallel genetic operations (crossover and mutation).

## Installation

To install the `@neat-evolution/worker-pool` package, use the following command:

```sh
yarn add @neat-evolution/worker-pool
```

## Key Components

The `worker-pool` package exposes the following key classes and interfaces:

- **`WorkerPool` class**:
  The main class that manages the pool of workers. It provides methods to `acquire` a worker from the pool and `release` it back when done. It uses a semaphore to block `acquire` calls when no workers are available.

- **`WorkerPoolOptions` interface**:
  Defines configuration options for the pool:
  - `threadCount`: The number of worker threads to spawn.
  - `taskCount`: The maximum number of concurrent tasks (capacity of the semaphore).
  - `workerScriptUrl`: The URL or string path to the worker script.
  - `workerOptions`: Optional options to pass to the `Worker` constructor (from `@neat-evolution/worker-threads`).
  - `verbose`: Enable logging for debugging.

## Usage

To use the `worker-pool`, create an instance with your desired configuration, wait for it to be ready, and then acquire/release workers as needed.

```typescript
import { hardwareConcurrency } from "@neat-evolution/worker-threads";

import { WorkerPool } from "@neat-evolution/worker-pool";

async function runWorkerPoolExample() {
  // 1. Configure the pool
  const pool = new WorkerPool({
    threadCount: hardwareConcurrency - 1, // Leave one core for the main thread
    taskCount: 100, // Max concurrent tasks allowed in the semaphore
    workerScriptUrl: new URL("./my-worker.js", import.meta.url),
    verbose: true,
  });

  // 2. Wait for workers to initialize
  await pool.ready();

  try {
    // 3. Acquire a worker
    const worker = await pool.acquire();

    // 4. Use the worker (e.g., send a message)
    worker.postMessage({ type: "HELLO" });

    // 5. Release the worker back to the pool
    pool.release(worker);
  } catch (error) {
    console.error("Error using worker pool:", error);
  } finally {
    // 6. Terminate the pool when done
    await pool.terminate();
  }
}
```

### Worker Script Requirement

The worker script pointed to by `workerScriptUrl` must send a `WORKER_READY` message (exported constant `WORKER_READY` from this package) to signal that it has initialized and is ready to receive tasks.

```typescript
// my-worker.js
import { workerContext } from '@neat-evolution/worker-threads'

import { WORKER_READY } from "@neat-evolution/worker-pool";

// ... initialization logic ...

// Signal ready
workerContext.postMessage({ type: WORKER_READY });
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE) file for details.
