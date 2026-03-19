import pDefer, { type DeferredPromise } from 'p-defer'

import { verboseLogger as logger } from '../logger.js'
import type { WorkerMessage } from '../types.js'
import { deserializeError } from './errors.js'

export interface CallOptions {
  timeout?: number
}

interface PendingCall {
  deferred: DeferredPromise<unknown>
  timeoutId?: ReturnType<typeof setTimeout>
}

export class CallManager {
  private callCounter = 0
  private readonly pendingCalls = new Map<string, PendingCall>()

  public createCall<T>(
    message: WorkerMessage,
    options?: CallOptions
  ): {
    callId: string
    messageWithId: WorkerMessage
    promise: Promise<T>
  } {
    // 1. Generate Correlation ID (Base36 for compactness)
    const callId = (this.callCounter++).toString(36)

    logger.debug(
      '[CallManager] createCall: generated callId:',
      callId,
      'for message:',
      message.type
    )

    // 2. Prepare Envelope
    const meta = { ...message.meta, callId }
    const messageWithId = { ...message, meta }

    // 3. Setup Deferred Promise
    const deferred = pDefer<T>()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    if (options?.timeout != null && options.timeout > 0) {
      timeoutId = setTimeout(() => {
        const def = this.pendingCalls.get(callId)
        if (def != null) {
          this.pendingCalls.delete(callId)
          def.deferred.reject(
            new Error(`Call timed out after ${options.timeout}ms`)
          )
        }
      }, options.timeout)
    }

    const pendingCall: PendingCall = {
      deferred: deferred as DeferredPromise<unknown>,
    }
    if (timeoutId !== undefined) {
      pendingCall.timeoutId = timeoutId
    }
    this.pendingCalls.set(callId, pendingCall)

    return {
      callId,
      messageWithId,
      promise: deferred.promise,
    }
  }

  public resolveCall(callId: string, payload: unknown) {
    const call = this.pendingCalls.get(callId)
    if (call != null) {
      logger.debug('[CallManager] resolveCall: resolving callId:', callId)
      this.pendingCalls.delete(callId)
      if (call.timeoutId != null) {
        clearTimeout(call.timeoutId)
      }
      call.deferred.resolve(payload)
      return true
    }
    return false
  }

  public rejectCall(callId: string, error: unknown) {
    const call = this.pendingCalls.get(callId)
    if (call != null) {
      logger.debug('[CallManager] rejectCall: rejecting callId:', callId)
      this.pendingCalls.delete(callId)
      if (call.timeoutId != null) {
        clearTimeout(call.timeoutId)
      }
      call.deferred.reject(deserializeError(error))
      return true
    }
    return false
  }

  /**
   * Checks if the message is a response and handles it if so.
   * Returns true if the message was a response (handled or not found), false otherwise.
   * @param {WorkerMessage} message - The message to check and handle.
   * @returns {boolean} - True if the message was a response, false otherwise.
   */
  public handleResponse(message: WorkerMessage): boolean {
    if (
      message.meta?.isResponse === true &&
      message.meta?.callId != null &&
      message.meta.callId.length > 0
    ) {
      const { callId } = message.meta

      logger.debug(
        '[CallManager] handleResponse: received response for callId:',
        callId
      )

      if (message.error === true) {
        const handled = this.rejectCall(callId, message.payload)
        if (!handled) {
          logger.debug(
            '[CallManager] handleResponse: no pending call found for callId:',
            callId
          )
        }
      } else {
        const handled = this.resolveCall(callId, message.payload)
        if (!handled) {
          logger.debug(
            '[CallManager] handleResponse: no pending call found for callId:',
            callId
          )
        }
      }
      return true
    }
    return false
  }
}
