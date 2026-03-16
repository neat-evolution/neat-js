import type { StaticExecutor } from '@neat-evolution/executor'
import type { WorkerMessage } from '@neat-evolution/worker-actions'
import type { BaseEvaluationContext } from './EnvironmentRuntimeOptions.js'

export interface WorkerEvaluationContext extends BaseEvaluationContext {
  /** Fire-and-forget message to main thread. */
  send(message: WorkerMessage): void
  /** RPC call to main thread. */
  call<R = unknown>(
    message: WorkerMessage,
    options?: { timeout?: number }
  ): Promise<R>

  /** Schedule Lamarckian writeback for an executor. Engine flushes once after fitness.
   *  Multiple calls for the same executor are idempotent (Set semantics).
   *  Engine calls executor.getUpdatedActions() lazily at flush time. */
  scheduleWriteback(executor: StaticExecutor): void

  /** Register cleanup callback. Fires after fitness is decided, after writeback flush. */
  onFitness(callback: (fitness: number) => void): void

  /** Map of executor → genomeEntry. Populated by the evaluator infrastructure.
   *  Used by the engine for writeback correlation. Available to factories for lookup. */
  executorMap: ReadonlyMap<StaticExecutor, unknown>
}
