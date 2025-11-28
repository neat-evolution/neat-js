import pDefer, { type DeferredPromise } from 'p-defer'

import type { WorkerAction } from '../types.js'

export interface RequestOptions {
  timeout?: number
}

interface PendingRequest {
  deferred: DeferredPromise<any>
  timeoutId?: any
}

export class RequestManager {
  private requestCounter = 0
  private readonly pendingRequests = new Map<string, PendingRequest>()
  private readonly verbose: boolean

  constructor(options?: { verbose?: boolean }) {
    this.verbose = options?.verbose ?? false
  }

  public createRequest<T>(
    action: WorkerAction,
    options?: RequestOptions
  ): {
    requestId: string
    actionWithId: WorkerAction
    promise: Promise<T>
  } {
    // 1. Generate Correlation ID (Base36 for compactness)
    const requestId = (this.requestCounter++).toString(36)

    if (this.verbose) {
      console.log(
        '[RequestManager] createRequest: generated requestId:',
        requestId,
        'for action:',
        action.type
      )
    }

    // 2. Prepare Envelope
    const meta = { ...action.meta, requestId }
    const actionWithId = { ...action, meta }

    // 3. Setup Deferred Promise
    const deferred = pDefer<T>()
    let timeoutId: any

    if (options?.timeout != null && options.timeout > 0) {
      timeoutId = setTimeout(() => {
        const def = this.pendingRequests.get(requestId)
        if (def != null) {
          this.pendingRequests.delete(requestId)
          def.deferred.reject(
            new Error(`Request timed out after ${options.timeout}ms`)
          )
        }
      }, options.timeout)
    }

    this.pendingRequests.set(requestId, { deferred, timeoutId })

    return {
      requestId,
      actionWithId,
      promise: deferred.promise,
    }
  }

  public resolveRequest(requestId: string, payload: any) {
    const request = this.pendingRequests.get(requestId)
    if (request != null) {
      if (this.verbose) {
        console.log(
          '[RequestManager] resolveRequest: resolving requestId:',
          requestId
        )
      }
      this.pendingRequests.delete(requestId)
      if (request.timeoutId != null) {
        clearTimeout(request.timeoutId)
      }
      request.deferred.resolve(payload)
      return true
    }
    return false
  }

  public rejectRequest(requestId: string, error: any) {
    const request = this.pendingRequests.get(requestId)
    if (request != null) {
      if (this.verbose) {
        console.log(
          '[RequestManager] rejectRequest: rejecting requestId:',
          requestId
        )
      }
      this.pendingRequests.delete(requestId)
      if (request.timeoutId != null) {
        clearTimeout(request.timeoutId)
      }
      request.deferred.reject(error)
      return true
    }
    return false
  }

  /**
   * Checks if the action is a response and handles it if so.
   * Returns true if the action was a response (handled or not found), false otherwise.
   * @param {WorkerAction} action - The action to check and handle.
   * @returns {boolean} - True if the action was a response, false otherwise.
   */
  public handleResponse(action: WorkerAction): boolean {
    if (
      action.meta?.isResponse === true &&
      action.meta?.requestId != null &&
      action.meta.requestId.length > 0
    ) {
      const { requestId } = action.meta

      if (this.verbose) {
        console.log(
          '[RequestManager] handleResponse: received response for requestId:',
          requestId
        )
      }

      if (action.error === true) {
        const handled = this.rejectRequest(requestId, action.payload)
        if (!handled && this.verbose) {
          console.log(
            '[RequestManager] handleResponse: no pending request found for requestId:',
            requestId
          )
        }
      } else {
        const handled = this.resolveRequest(requestId, action.payload)
        if (!handled && this.verbose) {
          console.log(
            '[RequestManager] handleResponse: no pending request found for requestId:',
            requestId
          )
        }
      }
      return true
    }
    return false
  }
}
