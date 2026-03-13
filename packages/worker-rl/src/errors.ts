export type WorkerRLDispatchFailureReason =
  | 'agent-environment-required'
  | 'capability-missing'
  | 'method-unsupported'
  | 'lamarckian-unsupported'
  | 'result-mismatch'
  | 'worker-call-failed'

export class WorkerRLDispatchError extends Error {
  readonly reason: WorkerRLDispatchFailureReason
  readonly method: 'actor-critic' | 'q-learning'
  readonly details?: Record<string, unknown>

  constructor(
    reason: WorkerRLDispatchFailureReason,
    method: 'actor-critic' | 'q-learning',
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
