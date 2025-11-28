import type { WorkerPool } from '@neat-evolution/worker-pool'
import type { Worker, Transferable } from '@neat-evolution/worker-threads'

import type {
  WorkerAction,
  DispatcherHandlerFn,
  DispatcherContext,
} from './types.js'
import { isWorkerAction } from './utils/actions.js'
import { RequestManager } from './utils/RequestManager.js'

export class Dispatcher {
  private readonly pool: WorkerPool
  private readonly requestManager: RequestManager

  // Map actionType -> Set of Handlers
  private readonly eventListeners = new Map<string, Set<DispatcherHandlerFn>>()
  private readonly verbose: boolean

  constructor(pool: WorkerPool, options?: { verbose?: boolean }) {
    this.pool = pool
    this.verbose = options?.verbose ?? false
    this.requestManager = new RequestManager({ verbose: this.verbose })

    if (this.verbose) {
      console.log('[Dispatcher] Constructor called, binding listeners')
    }
    this.bindWorkerListeners()
  }

  private bindWorkerListeners() {
    // Direct binding: We attach a permanent listener to every worker in the pool.
    // This works because the pool created workers in its constructor.
    const workers = this.pool.getWorkers()
    if (this.verbose) {
      console.log(`[Dispatcher] Binding listeners to ${workers.length} workers`)
    }

    for (const worker of workers) {
      // We use the standard EventTarget interface on the Worker abstraction
      worker.addEventListener('message', (event: any) => {
        // event.data contains the serialized action
        if (this.verbose) {
          console.log('[Dispatcher] Raw message received', event.data)
        }
        this._onMessage(event.data, worker)
      })
    }
  }

  public async dispatch(action: WorkerAction): Promise<void> {
    const worker = await this.pool.acquire()
    try {
      this.postMessage(worker, action)
    } finally {
      this.pool.release(worker)
    }
  }

  public async request<T>(
    action: WorkerAction,
    options?: { timeout?: number }
  ): Promise<T> {
    const { actionWithId, promise, requestId } =
      this.requestManager.createRequest<T>(action, options)

    // Send
    this.pool
      .acquire()
      .then((w: Worker) => {
        try {
          this.postMessage(w, actionWithId)
        } finally {
          this.pool.release(w)
        }
      })
      .catch((err: any) => {
        this.requestManager.rejectRequest(requestId, err)
      })

    return await promise
  }

  public async broadcast<T>(action: WorkerAction): Promise<T[]> {
    const workers = this.pool.getWorkers()

    const promises = workers.map(async (worker: Worker) => {
      const { actionWithId, promise } =
        this.requestManager.createRequest<T>(action)
      this.postMessage(worker, actionWithId)
      return await promise
    })

    return await Promise.all(promises)
  }

  private postMessage(worker: Worker, action: WorkerAction) {
    const transferList: Transferable[] = action.meta?.transferList ?? []
    worker.postMessage(action, transferList)
  }

  private _onMessage(message: any, worker: Worker) {
    if (this.verbose) {
      console.log('[Dispatcher] _onMessage received:', message)
    }
    if (message == null || typeof message !== 'object') return
    const action = message as WorkerAction

    if (this.verbose) {
      console.log(
        '[Dispatcher] _onMessage action type:',
        action.type,
        'meta:',
        action.meta
      )
    }

    // 1. Handle RPC Responses (Request/Response)
    if (this.requestManager.handleResponse(action)) {
      return
    }

    if (this.verbose) {
      console.log(
        '[Dispatcher] _onMessage: Checking for event listeners for:',
        action.type
      )
    }
    // 2. Handle Spontaneous Events (Worker -> Main)
    // This allows workers to "dispatch" actions back to the main thread
    if (isWorkerAction(message)) {
      const listeners = this.eventListeners.get(action.type)
      if (this.verbose) {
        console.log(
          '[Dispatcher] _onMessage: Found listeners:',
          listeners?.size ?? 0
        )
      }
      if (listeners != null) {
        const context: DispatcherContext = {
          // Targeted dispatch (reply to specific worker)
          dispatch: (act: WorkerAction) => {
            if (this.verbose) {
              console.log(
                '[Dispatcher] context.dispatch called with:',
                act.type
              )
            }
            this.postMessage(worker, act)
          },
          request: this.request.bind(this),
          broadcast: this.broadcast.bind(this),
          addActionHandler: this.addActionHandler.bind(this),
          removeActionHandler: this.removeActionHandler.bind(this),
        }

        if (this.verbose) {
          console.log(
            '[Dispatcher] _onMessage: Calling',
            listeners.size,
            'listener(s)'
          )
        }
        for (const listener of listeners) {
          listener(action, context)
        }
      }
    }
  }

  public addActionHandler(type: string, handler: DispatcherHandlerFn) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    const listeners = this.eventListeners.get(type)
    if (listeners != null) {
      listeners.add(handler)
    }
  }

  public removeActionHandler(type: string, handler: DispatcherHandlerFn) {
    const listeners = this.eventListeners.get(type)
    if (listeners != null) {
      listeners.delete(handler)
    }
  }
}
