import type { WorkerEventTypes } from '../EventTypes.js'
import type { MessageListenerFn } from '../MessageListenerFn.js'
import type { WorkerOptions, WebWorkerOptions } from '../WorkerOptions.js'

export type Transferable = ArrayBuffer | MessagePort

export class Worker {
  public readonly webWorker: globalThis.Worker

  constructor(scriptURL: string | URL, workerOptions: WorkerOptions) {
    // filter out NodeWorkerOptions
    const { credentials, name, type } = workerOptions
    const options: WebWorkerOptions = {}
    if (credentials != null) {
      options.credentials = credentials
    }
    if (name != null) {
      options.name = name
    }
    if (type != null) {
      options.type = type
    }
    this.webWorker = new globalThis.Worker(scriptURL, options)
  }

  addEventListener(type: WorkerEventTypes, listener: MessageListenerFn) {
    this.webWorker.addEventListener(type, listener as EventListener)
  }

  removeEventListener(type: WorkerEventTypes, listener: MessageListenerFn) {
    this.webWorker.removeEventListener(type, listener as EventListener)
  }

  postMessage(message: any, transferList?: Transferable[]) {
    // @ts-expect-error no interface in common
    this.webWorker.postMessage(message, transferList)
  }

  terminate() {
    this.webWorker.terminate()
  }
}
