import type { Transferable } from '@neat-evolution/worker-threads'

export interface WorkerAction<P = any> {
  type: string
  payload: P
  error?: boolean
  meta?: {
    requestId?: string
    isResponse?: boolean
    transferList?: Transferable[]
    [key: string]: any
  }
}

export interface FSA<P = any> extends WorkerAction<P> {}

// Context available to Main Thread Listeners (Event Bus)
export interface DispatcherContext {
  dispatch: (action: WorkerAction) => void
  request: <T = any>(
    action: WorkerAction,
    options?: { timeout?: number }
  ) => Promise<T>
  broadcast: <T = any>(action: WorkerAction) => Promise<T[]>
  addActionHandler: (type: string, handler: DispatcherHandlerFn) => void
  removeActionHandler: (type: string, handler: DispatcherHandlerFn) => void
}

// Context available to Worker Thread Handlers
export interface WorkerContext<P = any> {
  action: WorkerAction<P>
  dispatch: (action: WorkerAction) => void
  transfer: (transferables: Transferable[]) => void
  request: <T = any>(
    action: WorkerAction,
    options?: { timeout?: number }
  ) => Promise<T>
}

export type DispatcherHandlerFn = (
  action: WorkerAction,
  context: DispatcherContext
) => void

export type WorkerHandlerFn<P = any, R = any> = (
  payload: P,
  context: WorkerContext<P>
) => Promise<R> | R
