import type { WorkerPool } from '@neat-evolution/worker-pool'
import type { Transferable, Worker } from '@neat-evolution/worker-threads'

import { verboseLogger } from './logger.js'
import type {
  DispatcherContext,
  DispatcherHandlerFn,
  MessageCreator,
  WorkerMessage,
} from './types.js'
import { isWorkerMessage } from './utils/actions.js'
import { CallManager } from './utils/CallManager.js'

const logger = verboseLogger

export class Dispatcher {
  private readonly pool: WorkerPool
  private readonly callManager: CallManager

  // Map messageType -> Set of Handlers
  private readonly eventListeners = new Map<
    string,
    Set<DispatcherHandlerFn<any, any>>
  >()

  constructor(pool: WorkerPool) {
    this.pool = pool
    this.callManager = new CallManager()

    logger.debug('[Dispatcher] Constructor called, binding listeners')
    this.bindWorkerListeners()
  }

  private bindWorkerListeners() {
    // Direct binding: We attach a permanent listener to every worker in the pool.
    // This works because the pool created workers in its constructor.
    const workers = this.pool.getWorkers()
    logger.debug(`[Dispatcher] Binding listeners to ${workers.length} workers`)

    for (const worker of workers) {
      // We use the standard EventTarget interface on the Worker abstraction
      worker.addEventListener('message', (event: { data: unknown }) => {
        // event.data contains the serialized message
        logger.debug('[Dispatcher] Raw message received', event.data)
        this._onMessage(event.data, worker)
      })
    }
  }

  public async send(message: WorkerMessage): Promise<void> {
    const worker = await this.pool.acquire()
    try {
      this.postMessage(worker, message)
    } finally {
      this.pool.release(worker)
    }
  }

  public async call<R = unknown>(
    message: WorkerMessage<unknown, R>,
    options?: { timeout?: number }
  ): Promise<R> {
    const worker = await this.pool.acquire()
    try {
      return await this.callOnWorker(worker, message, options)
    } finally {
      this.pool.release(worker)
    }
  }

  public async callOnWorker<R = unknown>(
    worker: Worker,
    message: WorkerMessage<unknown, R>,
    options?: { timeout?: number }
  ): Promise<R> {
    const { messageWithId, promise, callId } = this.callManager.createCall<R>(
      message,
      options
    )
    try {
      this.postMessage(worker, messageWithId)
    } catch (err: unknown) {
      this.callManager.rejectCall(callId, err)
    }
    return await promise
  }

  public async broadcast<R = unknown>(
    message: WorkerMessage<unknown, R>
  ): Promise<R[]> {
    const workers = this.pool.getWorkers()

    const promises = workers.map(async (worker: Worker) => {
      const { messageWithId, promise } = this.callManager.createCall<R>(message)
      this.postMessage(worker, messageWithId)
      return await promise
    })

    return await Promise.all(promises)
  }

  private postMessage(worker: Worker, message: WorkerMessage) {
    const transferList: Transferable[] = message.meta?.transferList ?? []
    worker.postMessage(message, transferList)
  }

  private _onMessage(incoming: unknown, worker: Worker) {
    logger.debug('[Dispatcher] _onMessage received:', incoming)
    if (!isWorkerMessage(incoming)) return
    const message = incoming as WorkerMessage

    logger.debug(
      '[Dispatcher] _onMessage message type:',
      message.type,
      'meta:',
      message.meta
    )

    // 1. Handle RPC Responses (Call/Response)
    if (this.callManager.handleResponse(message)) {
      return
    }

    logger.debug(
      '[Dispatcher] _onMessage: Checking for message handlers for:',
      message.type
    )
    // 2. Handle Spontaneous Events (Worker -> Main)
    // This allows workers to "send" messages back to the main thread
    const listeners = this.eventListeners.get(message.type)
    logger.debug(
      '[Dispatcher] _onMessage: Found listeners:',
      listeners?.size ?? 0
    )
    if (listeners != null) {
      const context: DispatcherContext = {
        // Targeted send (reply to specific worker)
        send: (msg: WorkerMessage) => {
          logger.debug('[Dispatcher] context.send called with:', msg.type)
          this.postMessage(worker, msg)
        },
        call: this.call.bind(this),
        broadcast: this.broadcast.bind(this),
        addMessageHandler: this.addMessageHandler.bind(this),
        removeMessageHandler: this.removeMessageHandler.bind(this),
      }

      logger.debug(
        '[Dispatcher] _onMessage: Calling',
        listeners.size,
        'listener(s)'
      )
      for (const listener of listeners) {
        listener(message, context)
      }
    }
  }

  public addMessageHandler<P, R, Args extends unknown[]>(
    messageCreator: MessageCreator<P, R, Args>,
    handler: DispatcherHandlerFn<P, R>
  ): void
  public addMessageHandler(type: string, handler: DispatcherHandlerFn): void
  public addMessageHandler<P, R>(
    typeOrCreator: string | MessageCreator<P, R, unknown[]>,
    handler: DispatcherHandlerFn<P, R>
  ) {
    const type =
      typeof typeOrCreator === 'string'
        ? typeOrCreator
        : typeOrCreator.toString()
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    const listeners = this.eventListeners.get(type)
    if (listeners != null) {
      listeners.add(handler as DispatcherHandlerFn<any, any>)
    }
  }

  public removeMessageHandler<P, R, Args extends unknown[]>(
    messageCreator: MessageCreator<P, R, Args>,
    handler: DispatcherHandlerFn<P, R>
  ): void
  public removeMessageHandler(type: string, handler: DispatcherHandlerFn): void
  public removeMessageHandler<P, R>(
    typeOrCreator: string | MessageCreator<P, R, unknown[]>,
    handler: DispatcherHandlerFn<P, R>
  ) {
    const type =
      typeof typeOrCreator === 'string'
        ? typeOrCreator
        : typeOrCreator.toString()
    const listeners = this.eventListeners.get(type)
    if (listeners != null) {
      listeners.delete(handler as DispatcherHandlerFn<any, any>)
    }
  }
}
