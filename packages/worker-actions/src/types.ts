import type { Transferable } from '@neat-evolution/worker-threads'

export interface WorkerMessage<P = any> {
  type: string
  payload: P
  error?: boolean
  meta?: {
    callId?: string
    isResponse?: boolean
    transferList?: Transferable[]
    [key: string]: any
  }
}

/** @deprecated Use WorkerMessage */
export interface WorkerAction<P = any> extends WorkerMessage<P> {}

export interface FSA<P = any> extends WorkerMessage<P> {}

// Context available to Main Thread Listeners (Event Bus)
export interface DispatcherContext {
  send: (message: WorkerMessage) => void
  call: <T = any>(
    message: WorkerMessage,
    options?: { timeout?: number }
  ) => Promise<T>
  broadcast: <T = any>(message: WorkerMessage) => Promise<T[]>
  addMessageHandler: (type: string, handler: DispatcherHandlerFn) => void
  removeMessageHandler: (type: string, handler: DispatcherHandlerFn) => void

  /** @deprecated Use send */
  dispatch: (message: WorkerMessage) => void
  /** @deprecated Use call */
  request: <T = any>(
    message: WorkerMessage,
    options?: { timeout?: number }
  ) => Promise<T>
  /** @deprecated Use addMessageHandler */
  addActionHandler: (type: string, handler: DispatcherHandlerFn) => void
  /** @deprecated Use removeMessageHandler */
  removeActionHandler: (type: string, handler: DispatcherHandlerFn) => void
}

// Context available to Worker Thread Handlers
export interface WorkerContext<P = any> {
  message: WorkerMessage<P>
  send: (message: WorkerMessage) => void
  transfer: (transferables: Transferable[]) => void
  call: <T = any>(
    message: WorkerMessage,
    options?: { timeout?: number }
  ) => Promise<T>

  /** @deprecated Use message */
  action: WorkerMessage<P>
  /** @deprecated Use send */
  dispatch: (message: WorkerMessage) => void
  /** @deprecated Use call */
  request: <T = any>(
    message: WorkerMessage,
    options?: { timeout?: number }
  ) => Promise<T>
}

export type DispatcherHandlerFn = (
  message: WorkerMessage,
  context: DispatcherContext
) => void

export type WorkerHandlerFn<P = any, R = any> = (
  payload: P,
  context: WorkerContext<P>
) => Promise<R> | R
