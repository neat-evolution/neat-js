# @neat-js/worker-threads

Thin wrapper around [worker_threads](https://nodejs.org/api/worker_threads.html) to provide a cross-platform web worker-like API.

```sh
yarn add @neat-js/worker-threads
```

## Usage

```js
import { Worker } from '@neat-js/worker-threads';

const worker = new Worker('./worker.js');

worker.postMessage('Hello from main thread!');

worker.addEventListener('message', (event) => {
  console.log(`Message from worker: ${event.data}`);
});
```
