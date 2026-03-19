import type { WritebackPayload } from '@neat-evolution/core'
import type { WorkerEvaluationContext } from '@neat-evolution/execution-manager'
import type {
  StaticExecutor,
  TrainableExecutor,
} from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
import type { StatsRecorder } from '@neat-evolution/stats'
import type { RNG } from '@neat-evolution/utils'
import type { WorkerMessage } from '@neat-evolution/worker-actions'

export interface BoundContext extends WorkerEvaluationContext {
  /** Mutable executor map for registration during evaluation setup. */
  executorMap: Map<StaticExecutor, unknown>
  flush(): Map<number, WritebackPayload> | undefined
  fireFitnessCallbacks(fitness: number): void
}

/** Options accepted by createBoundContext. Uses a non-generic call signature
 *  to avoid variance mismatches between WorkerContext and WorkerEvaluationContext. */
export interface BoundContextInit {
  send?: ((message: WorkerMessage) => void) | undefined
  call?:
    | ((
        message: WorkerMessage,
        options?: { timeout?: number }
      ) => Promise<unknown>)
    | undefined
  stats?: StatsRecorder | undefined
  rng: RNG
}

export function createBoundContext(
  baseContext: BoundContextInit
): BoundContext {
  const executorMap = new Map<StaticExecutor, unknown>()
  const scheduledWritebacks = new Set<TrainableExecutor>()
  const fitnessCallbacks: Array<(fitness: number) => void> = []

  return {
    send: baseContext.send ?? (() => {}),
    call: (baseContext.call ??
      (() =>
        Promise.reject(
          new Error('call not available')
        ))) as BoundContext['call'],
    ...(baseContext.stats != null ? { stats: baseContext.stats } : {}),
    rng: baseContext.rng,
    executorMap,

    scheduleWriteback(executor: StaticExecutor) {
      if (isTrainableExecutor(executor)) {
        scheduledWritebacks.add(executor as TrainableExecutor)
      }
    },

    onFitness(callback: (fitness: number) => void) {
      fitnessCallbacks.push(callback)
    },

    flush() {
      if (scheduledWritebacks.size === 0) return undefined
      const results = new Map<number, WritebackPayload>()
      for (const executor of scheduledWritebacks) {
        const index = executorMap.get(executor)
        if (index != null) {
          results.set(index as number, executor.getUpdatedActions())
        }
      }
      scheduledWritebacks.clear()
      return results.size > 0 ? results : undefined
    },

    fireFitnessCallbacks(fitness: number) {
      for (const cb of fitnessCallbacks) {
        cb(fitness)
      }
      fitnessCallbacks.length = 0
    },
  }
}
