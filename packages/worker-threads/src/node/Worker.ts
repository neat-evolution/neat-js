import { Worker as NodeWorker, type MessagePort } from 'node:worker_threads'

import type { WorkerEventTypes } from '../EventTypes.js'
import type { WorkerOptions } from '../WorkerOptions.js'

export class Worker {
  public readonly nodeWorker: NodeWorker

  constructor(scriptURL: string | URL, options: WorkerOptions) {
    // filter out WebWorkerOptions
    const { credentials, type, ...nodeWorkerOptions } = options

    this.nodeWorker = new NodeWorker(scriptURL, {
      ...nodeWorkerOptions,
    })
  }

  addEventListener(type: WorkerEventTypes, listener: (...args: any[]) => void) {
    this.nodeWorker.on(type, listener)
  }

  removeEventListener(
    type: WorkerEventTypes,
    listener: (...args: any[]) => void
  ) {
    this.nodeWorker.off(type, listener)
  }

  postMessage(message: any, transferList?: Array<ArrayBuffer | MessagePort>) {
    this.nodeWorker.postMessage(message, transferList)
  }

  async terminate() {
    await this.nodeWorker.terminate()
  }
}
