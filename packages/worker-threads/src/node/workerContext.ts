import { type MessagePort, parentPort } from 'node:worker_threads'

import type { ContextEventTypes } from '../EventTypes.js'

type ContextListener = (event: unknown) => void

export const workerContext = {
  postMessage: (
    message: unknown,
    transferList?: Array<ArrayBuffer | MessagePort>
  ) => {
    parentPort?.postMessage(message, transferList)
  },

  addEventListener: (type: ContextEventTypes, listener: ContextListener) => {
    parentPort?.on(type, listener)
  },

  removeEventListener: (type: ContextEventTypes, listener: ContextListener) => {
    parentPort?.off(type, listener)
  },

  close: () => {
    parentPort?.close()
  },
}
