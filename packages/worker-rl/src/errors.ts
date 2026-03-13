import type { EvaluateRLAgentPayload } from './actions.js'

export type WorkerRLDispatchFailureReason =
  | 'agent-environment-required'
  | 'capability-missing'
  | 'method-unsupported'
  | 'lamarckian-unsupported'
  | 'result-mismatch'
  | 'worker-call-failed'

export class WorkerRLDispatchError extends Error {
  readonly reason: WorkerRLDispatchFailureReason
  readonly method: EvaluateRLAgentPayload['method']
  readonly details?: Record<string, unknown>

  constructor(
    reason: WorkerRLDispatchFailureReason,
    method: EvaluateRLAgentPayload['method'],
    message: string,
    options?: { cause?: unknown; details?: Record<string, unknown> }
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined
    )
    this.reason = reason
    this.method = method
    if (options?.details !== undefined) {
      this.details = options.details
    }
  }
}
