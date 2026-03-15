import type { StaticExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type { WorkerContext } from '@neat-evolution/worker-actions'

import type { EvaluateBatchPayload, EvaluateBatchResult } from '../actions.js'

import { createBoundContext } from './createBoundContext.js'
import { createCachedExecutorEntry } from './createCachedExecutorEntry.js'
import type { ThreadContext } from './ThreadContext.js'

export type HandleEvaluateBatchFn = (
  options: EvaluateBatchPayload,
  context: ThreadContext & Partial<WorkerContext>
) => Promise<EvaluateBatchResult>

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

  // Create a bound context for this batch evaluation
  const boundContext = createBoundContext({
    send: context.send,
    call: context.call,
    stats: context.stats,
  })

  // Hydrate all genomes and register executors in bound context
  const entries = batchGenomeOptions.map((genomeFactoryOptions) =>
    createCachedExecutorEntry(genomeFactoryOptions, context, { cache: true })
  )
  const executors: StaticExecutor[] = entries.map((entry, i) => {
    boundContext.executorMap.set(entry.executor, i)
    return entry.executor
  })

  let fitnessScores: number[]

  if (environment.isAsync) {
    if (environment.evaluateBatchAsync == null) {
      throw new Error('evaluateBatchAsync not implemented on environment')
    }
    fitnessScores = await environment.evaluateBatchAsync(executors, rng)
  } else {
    if (environment.evaluateBatch == null) {
      throw new Error('evaluateBatch not implemented on environment')
    }
    fitnessScores = environment.evaluateBatch(executors, rng)
  }

  // Flush writebacks and fire onFitness callbacks for each fitness score
  const writebacks = boundContext.flush()
  for (const fitness of fitnessScores) {
    boundContext.fireFitnessCallbacks(fitness)
  }

  const result: EvaluateBatchResult = { fitnessScores }
  if (writebacks != null) {
    result.writebacks = writebacks
  }
  return result
}
