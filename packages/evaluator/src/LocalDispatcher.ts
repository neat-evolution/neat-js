import type {
  DispatcherContext,
  DispatcherHandlerFn,
  WorkerMessage,
} from '@neat-evolution/worker-actions'

/**
 * In-process dispatcher that mirrors the worker Dispatcher protocol.
 * Registered handlers are invoked locally — no threads, no serialization.
 * Strategies and handlers use the same DispatcherContext interface regardless
 * of whether they're running through LocalDispatcher or the worker Dispatcher.
 */
export class LocalDispatcher {
  private readonly handlers = new Map<string, Set<DispatcherHandlerFn>>()
  private callCounter = 0

  readonly context: DispatcherContext = {
    send: this.send.bind(this),
    call: this.call.bind(this),
    broadcast: this.broadcast.bind(this),
    addMessageHandler: this.addMessageHandler.bind(this),
    removeMessageHandler: this.removeMessageHandler.bind(this),
    // Deprecated aliases
    dispatch: this.send.bind(this),
    request: this.call.bind(this),
    addActionHandler: this.addMessageHandler.bind(this),
    removeActionHandler: this.removeMessageHandler.bind(this),
  }

  addMessageHandler(type: string, handler: DispatcherHandlerFn): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
  }

  removeMessageHandler(type: string, handler: DispatcherHandlerFn): void {
    this.handlers.get(type)?.delete(handler)
  }

  /** Fire-and-forget: invoke all registered handlers for the message type. */
  send(message: WorkerMessage): void {
    const listeners = this.handlers.get(message.type)
    if (listeners) {
      for (const handler of listeners) {
        handler(message, this.context)
      }
    }
  }

  /**
   * RPC: invoke handlers for the message type, capture the RESPONSE.
   * Uses a deferred Promise so async handlers work correctly.
   */
  async call<R>(
    message: WorkerMessage<unknown, R>,
    _options?: { timeout?: number }
  ): Promise<R> {
    const callId = (this.callCounter++).toString(36)
    const messageWithId: WorkerMessage<unknown, R> = {
      ...message,
      meta: { ...message.meta, callId },
    }

    let resolve!: (value: R) => void
    const promise = new Promise<R>((res) => {
      resolve = res
    })

    let responded = false

    // Create a context that captures the RPC response
    const callContext: DispatcherContext = {
      ...this.context,
      send: (msg: WorkerMessage) => {
        if (msg.meta?.isResponse && msg.meta?.callId === callId) {
          responded = true
          resolve(msg.payload as R)
        } else {
          // Non-response messages dispatch normally
          this.send(msg)
        }
      },
      dispatch: (msg: WorkerMessage) => {
        callContext.send(msg)
      },
    }

    const listeners = this.handlers.get(message.type)
    if (listeners) {
      for (const handler of listeners) {
        handler(messageWithId, callContext)
      }
    }

    // If a handler responded synchronously, return immediately
    if (responded) {
      return promise
    }

    // Otherwise wait for the async response
    return promise
  }

  /** Broadcast: same as call() but returns [result] (one "worker" = self). */
  async broadcast<R>(message: WorkerMessage<unknown, R>): Promise<R[]> {
    const result = await this.call(message)
    return [result]
  }
}
