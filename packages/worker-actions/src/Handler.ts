import { WORKER_READY } from '@neat-evolution/worker-pool'
import type { Transferable } from '@neat-evolution/worker-threads'
import { workerContext } from '@neat-evolution/worker-threads'

import type { WorkerAction, WorkerHandlerFn, WorkerContext } from './types.js'
import { RequestManager } from './utils/RequestManager.js'

const DEFAULT_READY_TIMEOUT_MS = 20
export class Handler {
  private readonly handlers = new Map<string, WorkerHandlerFn>()
  private readonly scope = workerContext
  private readonly requestManager: RequestManager

  private readonly verbose: boolean
  private readyTimeoutId: any

  constructor(options?: { verbose?: boolean; readyTimeoutMs?: number }) {
    this.verbose = options?.verbose ?? false
    this.requestManager = new RequestManager({ verbose: this.verbose })

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

  public async request<T>(
    action: WorkerAction,
    options?: { timeout?: number }
  ): Promise<T> {
    const { actionWithId, promise } = this.requestManager.createRequest<T>(
      action,
      options
    )

    this.postMessage(actionWithId, actionWithId.meta?.transferList)

    if (this.verbose) {
      console.log(
        '[Handler] request: waiting for response to requestId:',
        actionWithId.meta?.requestId
      )
    }
    const result = await promise
    if (this.verbose) {
      console.log(
        '[Handler] request: received response for requestId:',
        actionWithId.meta?.requestId,
        result
      )
    }
    return result
  }

  private async handleMessage(eventOrAction: any) {
    // Handle CompatMessageEvent format: {data: action, type: 'message'}
    const action = eventOrAction?.data ?? eventOrAction

    if (action == null || typeof action.type !== 'string') return

    if (this.verbose) {
      console.log('[Handler] handleMessage received:', action.type, action.meta)
    }

    // 1. Handle RPC Responses (Request/Response)
    if (this.requestManager.handleResponse(action)) {
      return
    }

    // 2. Handle regular actions with handlers
    const handler = this.handlers.get(action.type)
    if (handler == null) return

    try {
      const transferList: Transferable[] = []

      const context: WorkerContext = {
        action,
        dispatch: (act: WorkerAction) => {
          this.postMessage(act, act.meta?.transferList)
        },
        transfer: (items: Transferable[]) => transferList.push(...items),
        request: async <T = any>(
          act: WorkerAction,
          options?: { timeout?: number }
        ) => {
          return await this.request<T>(act, options)
        },
      }

      // Execute Handler
      const result = await handler(action.payload, context)

      // If this was a Request, send the Response
      if (action.meta?.requestId != null) {
        this.reply(action.meta.requestId, result, transferList)
      }
    } catch (error) {
      if (action.meta?.requestId != null) {
        this.replyError(action.meta.requestId, error)
      } else {
        console.error(`[Worker] Error handling ${action.type}: `, error)
      }
    }
  }

  private reply(
    requestId: string,
    payload: any,
    transferList: Transferable[] = []
  ) {
    const response: WorkerAction = {
      type: 'RESPONSE',
      payload,
      meta: {
        requestId,
        isResponse: true,
        transferList,
      },
    }
    this.postMessage(response, transferList)
  }

  private replyError(requestId: string, error: any) {
    const response: WorkerAction = {
      type: 'RESPONSE_ERROR',
      payload: error instanceof Error ? error.message : error,
      error: true,
      meta: {
        requestId,
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
