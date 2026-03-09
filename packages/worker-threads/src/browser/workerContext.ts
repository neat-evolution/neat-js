import type { ContextEventTypes } from '../EventTypes.js'

declare let self: DedicatedWorkerGlobalScope

const ctx: DedicatedWorkerGlobalScope | null =
  'DedicatedWorkerGlobalScope' in self
    ? (self as unknown as DedicatedWorkerGlobalScope)
    : null

type ContextListener = (event: unknown) => void

export const workerContext = {
  postMessage: (
    message: unknown,
    transferList?: Array<ArrayBuffer | MessagePort>
  ) => {
    // @ts-expect-error no interface in common
    ctx?.postMessage(message, transferList)
  },

  addEventListener: (type: ContextEventTypes, listener: ContextListener) => {
    ctx?.addEventListener(type, listener as EventListener)
  },

  removeEventListener: (type: ContextEventTypes, listener: ContextListener) => {
    ctx?.removeEventListener(type, listener as EventListener)
  },

  close: () => {
    ctx?.close()
  },
}
