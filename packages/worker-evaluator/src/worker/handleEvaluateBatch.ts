import type { Executor, SyncExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type { WorkerContext } from '@neat-evolution/worker-actions'

import type { EvaluateBatchPayload } from '../actions.js'

import { createCachedExecutorEntry } from './createCachedExecutorEntry.js'
import type { ThreadContext } from './ThreadContext.js'

export type HandleEvaluateBatchFn = (
  options: EvaluateBatchPayload,
  context: ThreadContext & Partial<WorkerContext>
) => Promise<number[]>

export const handleEvaluateBatch: HandleEvaluateBatchFn = async (
  options,
  context
) => {
  const { genomeOptions: batchGenomeOptions, seed } = options
  if (context.threadInfo == null) {
    throw new Error('handleEvaluateBatch threadInfo not initialized')
  }
  if (context.genomeFactoryConfig == null) {
    throw new Error('genomeFactoryConfig not initialized')
  }

  const rng = seed != null ? createRNG(seed) : undefined
  const { environment } = context.threadInfo

  // Hydrate all genomes
  const entries = batchGenomeOptions.map((genomeFactoryOptions) =>
    createCachedExecutorEntry(genomeFactoryOptions, context, { cache: true })
  )
  const executors: Executor[] = entries.map((entry) => entry.executor)

  // Determine async
  const isAsync = entries.some((entry) => entry.isAsync) || environment.isAsync

  if (isAsync) {
    if (environment.evaluateBatchAsync == null) {
      throw new Error('evaluateBatchAsync not implemented on environment')
    }
    return await environment.evaluateBatchAsync(executors, rng)
  }

  if (environment.evaluateBatch == null) {
    throw new Error('evaluateBatch not implemented on environment')
  }
  return environment.evaluateBatch(executors as SyncExecutor[], rng)
}
