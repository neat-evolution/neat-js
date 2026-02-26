# @neat-evolution/worker-actions

The `@neat-evolution/worker-actions` package provides a type-safe, structured messaging layer for communication between the main thread and worker threads. It abstracts away the raw `postMessage` / `onmessage` API, offering a request/response (Call) pattern, targeted sending, and broadcasting capabilities.

## Purpose

The primary purpose of the `@neat-evolution/worker-actions` package is to:

- **Simplify Worker Communication:** Provide a clean API (`send`, `call`, `broadcast`) for interacting with workers.
- **Type Safety:** Use the `WorkerMessage` interface and `createMessage` utility to define structured messages with types and payloads.
- **Call/Response Support:** Implement a correlation mechanism (`callId`) to allow `await`-ing responses from workers, similar to an RPC call.
- **Broadcasting:** Easily send a message to all workers in a pool simultaneously.
- **Transferable Support:** seamless handling of `Transferable` objects (like `ArrayBuffer`) for efficient data passing.

## How it Fits into the Ecosystem

The `worker-actions` package sits on top of `worker-pool` and `worker-threads`.

- **`@neat-evolution/worker-pool`**: Used to manage the underlying workers that `Dispatcher` interacts with.
- **`@neat-evolution/worker-evaluator`**: Uses `worker-actions` to coordinate genome evaluation tasks.
- **`@neat-evolution/worker-reproducer`**: Uses `worker-actions` to coordinate reproduction tasks.

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
yarn add @neat-evolution/worker-actions
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/worker-actions
```

## Key Components

The `worker-actions` package exposes the following key classes and types:

- **`Dispatcher` class (Main Thread)**:
  Manages communication from the main thread to the worker pool.
  - `send(message)`: Sends a fire-and-forget message to a single available worker.
  - `call(message)`: Sends a message to a worker and waits for a response (RPC).
  - `broadcast(message)`: Sends a message to *all* workers in the pool and waits for all responses.
  - `addMessageHandler(type, handler)`: Registers a listener for spontaneous events sent from workers.

- **`Handler` class (Worker Thread)**:
  Manages communication inside the worker thread.
  - `register(type, handler)`: Registers a function to handle specific message types.
  - `ready()`: Signals that the worker is ready to receive messages.
  - `call(message)`: Allows the worker to send a call back to the main thread (if supported).

- **`createMessage(type)` utility**:
  A helper function to create strongly-typed message creators.

- **`WorkerMessage<P>` interface**:
  Defines the structure of a message:
  - `type`: A string identifying the message.
  - `payload`: The data associated with the message.
  - `meta`: Optional metadata, including `callId` and `transferList`.

## Usage

### 1. Define Messages

Use `createMessage` to define your message creators. This ensures type safety for payloads.

```typescript
// messages.ts
import { createMessage, WorkerMessage } from "@neat-evolution/worker-actions";

// Define payload types
export interface AddPayload {
  a: number;
  b: number;
}

// Create message creators
export const add = createMessage<AddPayload>("ADD");
export const result = createMessage<number>("RESULT");

// Export message types if needed
export type AddMessage = ReturnType<typeof add>;
```

### 2. Setup Worker (Handler)

Register handlers using the message type string (available via `.toString()` on the message creator).

```typescript
// worker.ts
import { Handler, WorkerContext } from "@neat-evolution/worker-actions";

import { add } from "./messages";

const handler = new Handler();

// Register a handler for the 'ADD' action
handler.register(add.toString(), async (payload: { a: number; b: number }, context: WorkerContext) => {
  const sum = payload.a + payload.b;
  return sum; // Automatically sent back as a response if it was a call
});

// Signal that the worker is initialized
handler.ready();
```

### 3. Setup Main Thread (Dispatcher)

Use the `Dispatcher` to send messages created by your message creators.

```typescript
// main.ts
import { WorkerPool } from "@neat-evolution/worker-pool";

import { Dispatcher } from "@neat-evolution/worker-actions";

import { add } from "./messages";

async function run() {
  const pool = new WorkerPool({ /* ... options ... */ });
  await pool.ready();

  const dispatcher = new Dispatcher(pool);

  // Send a call and await the result
  // TypeScript infers the return type based on what the handler returns (if typed correctly)
  // or you can specify it explicitly:
  const sum = await dispatcher.call<number>(add({ a: 5, b: 3 }));

  console.log("Result:", sum); // Output: 8

  await pool.terminate();
}
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE) file for details.
