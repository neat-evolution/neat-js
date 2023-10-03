// @ts-expect-error parentPort is exported by node:worker_threads
import { parentPort, type MessagePort } from 'node:worker_threads'

import type { ContextEventTypes } from '../EventTypes.js'

export const workerContext = {
  postMessage: (
    message: any,
    transferList?: Array<ArrayBuffer | MessagePort>
  ) => {
    parentPort?.postMessage(message, transferList)
  },

  addEventListener: (
    type: ContextEventTypes,
    listener: (...args: any[]) => void
  ) => {
    parentPort?.on(type, listener)
  },

  removeEventListener: (
    type: ContextEventTypes,
    listener: (...args: any[]) => void
  ) => {
    parentPort?.off(type, listener)
  },

  close: () => {
    parentPort?.close()
  },
}
