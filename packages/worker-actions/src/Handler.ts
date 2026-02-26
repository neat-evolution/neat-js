import { WORKER_READY } from '@neat-evolution/worker-pool'
import type { Transferable } from '@neat-evolution/worker-threads'
import { workerContext } from '@neat-evolution/worker-threads'

import type { WorkerMessage, WorkerHandlerFn, WorkerContext } from './types.js'
import { CallManager } from './utils/CallManager.js'

const DEFAULT_READY_TIMEOUT_MS = 20
export class Handler {
  private readonly handlers = new Map<string, WorkerHandlerFn>()
  private readonly scope = workerContext
  private readonly callManager: CallManager

  private readonly verbose: boolean
  private readyTimeoutId: any

  constructor(options?: { verbose?: boolean; readyTimeoutMs?: number }) {
    this.verbose = options?.verbose ?? false
    this.callManager = new CallManager({ verbose: this.verbose })

    this.scope.addEventListener('message', (event: any) => {
      void this.handleMessage(event.data)
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

  public register(type: string, handler: WorkerHandlerFn) {
    this.handlers.set(type, handler)
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

  /** @deprecated Use call */
  public async request<T>(
    message: WorkerMessage,
    options?: { timeout?: number }
  ): Promise<T> {
    return await this.call<T>(message, options)
  }

  private async handleMessage(incoming: any) {
    // Handle CompatMessageEvent format: {data: message, type: 'message'}
    const message = incoming?.data ?? incoming

    if (message == null || typeof message.type !== 'string') return

    if (this.verbose) {
      console.log('[Handler] handleMessage received:', message.type, message.meta)
    }

    // 1. Handle RPC Responses (Call/Response)
    if (this.callManager.handleResponse(message)) {
      return
    }

    // 2. Handle regular messages with handlers
    const handler = this.handlers.get(message.type)
    if (handler == null) return

    try {
      const transferList: Transferable[] = []

      const context: WorkerContext = {
        message,
        send: (msg: WorkerMessage) => {
          this.postMessage(msg, msg.meta?.transferList)
        },
        transfer: (items: Transferable[]) => transferList.push(...items),
        call: async <T = any>(
          msg: WorkerMessage,
          options?: { timeout?: number }
        ) => {
          return await this.call<T>(msg, options)
        },

        // Deprecated aliases
        action: message,
        dispatch: (msg: WorkerMessage) => {
          this.postMessage(msg, msg.meta?.transferList)
        },
        request: async <T = any>(
          msg: WorkerMessage,
          options?: { timeout?: number }
        ) => {
          return await this.call<T>(msg, options)
        },
      }

      // Execute Handler
      const result = await handler(message.payload, context)

      // If this was a Call, send the Response
      if (message.meta?.callId != null) {
        this.reply(message.meta.callId, result, transferList)
      }
    } catch (error) {
      if (message.meta?.callId != null) {
        this.replyError(message.meta.callId, error)
      } else {
        console.error(`[Worker] Error handling ${message.type}: `, error)
      }
    }
  }

  private reply(
    callId: string,
    payload: any,
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

  private replyError(callId: string, error: any) {
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

  private postMessage(message: any, transferList: Transferable[] = []) {
    if (typeof this.scope.postMessage === 'function') {
      this.scope.postMessage(message, transferList)
    }
  }
}
