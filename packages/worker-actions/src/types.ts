import type { Transferable } from '@neat-evolution/worker-threads'

export interface WorkerMessage<P = unknown, R = unknown> {
  type: string
  payload: P
  error?: boolean
  readonly __responseType?: R
  meta?: {
    callId?: string
    isResponse?: boolean
    transferList?: Transferable[]
    [key: string]: unknown
  }
}

/** @deprecated Use WorkerMessage */
export interface WorkerAction<P = unknown, R = unknown>
  extends WorkerMessage<P, R> {}

export interface FSA<P = unknown, R = unknown> extends WorkerMessage<P, R> {}

export type MessageCreator<
  P = unknown,
  R = unknown,
  Args extends unknown[] = [payload: P],
> = ((...args: Args) => WorkerMessage<P, R>) & {
  toString(): string
}

// Context available to Main Thread Listeners (Event Bus)
export interface DispatcherContext {
  send: (message: WorkerMessage) => void
  call: <R = unknown>(
    message: WorkerMessage<unknown, R>,
    options?: { timeout?: number }
  ) => Promise<R>
  broadcast: <R = unknown>(message: WorkerMessage<unknown, R>) => Promise<R[]>
  addMessageHandler: (type: string, handler: DispatcherHandlerFn) => void
  removeMessageHandler: (type: string, handler: DispatcherHandlerFn) => void
}

// Context available to Worker Thread Handlers
export interface WorkerContext<P = unknown> {
  message: WorkerMessage<P>
  send: (message: WorkerMessage) => void
  transfer: (transferables: Transferable[]) => void
  call: <R = unknown>(
    message: WorkerMessage<unknown, R>,
    options?: { timeout?: number }
  ) => Promise<R>
}

export type DispatcherHandlerFn<P = unknown, R = unknown> = (
  message: WorkerMessage<P, R>,
  context: DispatcherContext
) => void

export type WorkerHandlerFn<P = unknown, R = unknown> = (
  payload: P,
  context: WorkerContext<P>
) => Promise<R> | R
