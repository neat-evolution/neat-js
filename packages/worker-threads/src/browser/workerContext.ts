import type { ContextEventTypes } from '../EventTypes.js'

declare let self: DedicatedWorkerGlobalScope

const ctx: DedicatedWorkerGlobalScope | null =
  'DedicatedWorkerGlobalScope' in self
    ? (self as unknown as DedicatedWorkerGlobalScope)
    : null

export const workerContext = {
  postMessage: (
    message: any,
    transferList?: Array<ArrayBuffer | MessagePort>
  ) => {
    ctx?.postMessage(message, transferList)
  },

  addEventListener: (
    type: ContextEventTypes,
    listener: (...args: any[]) => void
  ) => {
    ctx?.addEventListener(type, listener as EventListener)
  },

  removeEventListener: (
    type: ContextEventTypes,
    listener: (...args: any[]) => void
  ) => {
    ctx?.removeEventListener(type, listener as EventListener)
  },

  close: () => {
    ctx?.close()
  },
}
