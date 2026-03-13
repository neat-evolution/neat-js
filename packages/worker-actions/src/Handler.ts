import { WORKER_READY } from '@neat-evolution/worker-pool'
import type { Transferable } from '@neat-evolution/worker-threads'
import { workerContext } from '@neat-evolution/worker-threads'

import type {
  MessageCreator,
  WorkerContext,
  WorkerHandlerFn,
  WorkerMessage,
} from './types.js'
import { CallManager } from './utils/CallManager.js'

const DEFAULT_READY_TIMEOUT_MS = 20
export class Handler {
  private readonly handlers = new Map<string, WorkerHandlerFn<any, any>>()
  private readonly scope = workerContext
  private readonly callManager: CallManager

  private readonly verbose: boolean
  private readyTimeoutId: ReturnType<typeof setTimeout> | null = null

  constructor(options?: { verbose?: boolean; readyTimeoutMs?: number }) {
    this.verbose = options?.verbose ?? false
    this.callManager = new CallManager({ verbose: this.verbose })

    this.scope.addEventListener('message', (event: unknown) => {
      void this.handleMessage(event)
    })

    // Safety timeout: if ready() isn't called manually, send it automatically
    // This prevents workers from hanging if the developer forgets to call ready()
    this.readyTimeoutId = setTimeout(() => {
      if (!this.isReady) {
        console.warn(
          '[Handler] Warning: handler.ready() was not called manually. Sending WORKER_READY signal automatically.'
        )
        this.ready()
      }
    }, options?.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS)
  }

  private isReady = false

  public ready() {
    if (this.readyTimeoutId != null) {
      clearTimeout(this.readyTimeoutId)
      this.readyTimeoutId = null
    }
    if (this.isReady) return
    this.isReady = true
    this.postMessage({ type: WORKER_READY })
  }

  public register<P, Args extends unknown[], R>(
    messageCreator: MessageCreator<P, R, Args>,
    handler: WorkerHandlerFn<P, R>
  ): void
  public register<P, R>(type: string, handler: WorkerHandlerFn<P, R>): void
  public register<P, R>(
    typeOrCreator: string | MessageCreator<P, R, unknown[]>,
    handler: WorkerHandlerFn<P, R>
  ) {
    const type =
      typeof typeOrCreator === 'string'
        ? typeOrCreator
        : typeOrCreator.toString()
    this.handlers.set(type, handler as WorkerHandlerFn<any, any>)
  }

  public async call<T>(
    message: WorkerMessage,
    options?: { timeout?: number }
  ): Promise<T> {
    const { messageWithId, promise } = this.callManager.createCall<T>(
      message,
      options
    )

    this.postMessage(messageWithId, messageWithId.meta?.transferList)

    if (this.verbose) {
      console.log(
        '[Handler] call: waiting for response to callId:',
        messageWithId.meta?.callId
      )
    }
    const result = await promise
    if (this.verbose) {
      console.log(
        '[Handler] call: received response for callId:',
        messageWithId.meta?.callId,
        result
      )
    }
    return result
  }

  private async handleMessage(incoming: unknown) {
    // Handle CompatMessageEvent format: {data: message, type: 'message'}
    const message =
      incoming != null &&
      typeof incoming === 'object' &&
      'data' in incoming &&
      (incoming as { data?: unknown }).data !== undefined
        ? (incoming as { data: unknown }).data
        : incoming

    if (
      message == null ||
      typeof message !== 'object' ||
      !('type' in message) ||
      typeof message.type !== 'string'
    ) {
      return
    }
    const workerMessage = message as WorkerMessage

    if (this.verbose) {
      console.log(
        '[Handler] handleMessage received:',
        workerMessage.type,
        workerMessage.meta
      )
    }

    // 1. Handle RPC Responses (Call/Response)
    if (this.callManager.handleResponse(workerMessage)) {
      return
    }

    // 2. Handle regular messages with handlers
    const handler = this.handlers.get(workerMessage.type)
    if (handler == null) return

    try {
      const transferList: Transferable[] = []

      const context: WorkerContext = {
        message: workerMessage,
        send: (msg: WorkerMessage) => {
          this.postMessage(msg, msg.meta?.transferList)
        },
        transfer: (items: Transferable[]) => transferList.push(...items),
        call: async <T = unknown>(
          msg: WorkerMessage,
          options?: { timeout?: number }
        ) => {
          return await this.call<T>(msg, options)
        },
      }

      // Execute Handler
      const result = await handler(workerMessage.payload, context)

      // If this was a Call, send the Response
      if (workerMessage.meta?.callId != null) {
        this.reply(workerMessage.meta.callId, result, transferList)
      }
    } catch (error) {
      if (workerMessage.meta?.callId != null) {
        this.replyError(workerMessage.meta.callId, error)
      } else {
        console.error(`[Worker] Error handling ${workerMessage.type}: `, error)
      }
    }
  }

  private reply(
    callId: string,
    payload: unknown,
    transferList: Transferable[] = []
  ) {
    const response: WorkerMessage = {
      type: 'RESPONSE',
      payload,
      meta: {
        callId,
        isResponse: true,
        transferList,
      },
    }
    this.postMessage(response, transferList)
  }

  private replyError(callId: string, error: unknown) {
    const response: WorkerMessage = {
      type: 'RESPONSE_ERROR',
      payload: error instanceof Error ? error.message : error,
      error: true,
      meta: {
        callId,
        isResponse: true,
        transferList: [],
      },
    }
    this.postMessage(response)
  }

  private postMessage(message: unknown, transferList: Transferable[] = []) {
    if (typeof this.scope.postMessage === 'function') {
      this.scope.postMessage(message, transferList)
    }
  }
}
