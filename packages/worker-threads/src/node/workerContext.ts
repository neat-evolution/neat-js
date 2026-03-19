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
    if (type === 'error') {
      process.on('uncaughtException', listener)
      process.on('unhandledRejection', listener)
    } else {
      parentPort?.on(type, listener)
    }
  },

  removeEventListener: (type: ContextEventTypes, listener: ContextListener) => {
    if (type === 'error') {
      process.off('uncaughtException', listener)
      process.off('unhandledRejection', listener)
    } else {
      parentPort?.off(type, listener)
    }
  },

  close: () => {
    parentPort?.close()
  },
}
