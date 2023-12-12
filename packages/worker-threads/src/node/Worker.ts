import { Worker as NodeWorker, type MessagePort } from 'node:worker_threads'

import type { WorkerEventTypes } from '../EventTypes.js'
import { CompatMessageEvent } from '../MessageEvent.js'
import type {
  MessageListenerFn,
  NodeMessageListenerFn,
} from '../MessageListenerFn.js'
import type { WorkerOptions } from '../WorkerOptions.js'

export class Worker {
  public readonly nodeWorker: NodeWorker
  protected readonly listenerMap = new WeakMap<
    MessageListenerFn,
    NodeMessageListenerFn
  >()

  constructor(scriptURL: string | URL, options: WorkerOptions) {
    // filter out WebWorkerOptions
    const { credentials, type, ...nodeWorkerOptions } = options

    this.nodeWorker = new NodeWorker(scriptURL, {
      ...nodeWorkerOptions,
    })
  }

  addEventListener(type: WorkerEventTypes, listener: MessageListenerFn) {
    const nodeListener = (message: any) => {
      listener(new CompatMessageEvent(message))
    }
    this.listenerMap.set(listener, nodeListener)
    this.nodeWorker.on(type, nodeListener)
  }

  removeEventListener(type: WorkerEventTypes, listener: MessageListenerFn) {
    const nodeListener = this.listenerMap.get(listener)
    if (nodeListener == null) {
      return
    }
    this.nodeWorker.off(type, nodeListener)
  }

  postMessage(message: any, transferList?: Array<ArrayBuffer | MessagePort>) {
    this.nodeWorker.postMessage(new CompatMessageEvent(message), transferList)
  }

  async terminate() {
    await this.nodeWorker.terminate()
  }
}
