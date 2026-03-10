import type { SyncExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type { WorkerContext } from '@neat-evolution/worker-actions'

import type { EvaluateGenomePayload } from '../actions.js'

import { createCachedExecutorEntry } from './createCachedExecutorEntry.js'
import type { ThreadContext } from './ThreadContext.js'

export type HandleEvaluateGenomeFn = (
  options: EvaluateGenomePayload,
  context: ThreadContext & Partial<WorkerContext>
) => Promise<number>

export const handleEvaluateGenome: HandleEvaluateGenomeFn = async (
  options,
  context
) => {
  const { genomeOptions: genomeFactoryOptions, seed } = options
  if (context.threadInfo == null) {
    throw new Error('handleEvaluateGenome threadInfo not initialized')
  }
  if (context.genomeFactoryConfig == null) {
    throw new Error('genomeFactoryConfig not initialized')
  }

  const rng = seed != null ? createRNG(seed) : undefined
  const { environment } = context.threadInfo
  const { executor, isAsync } = createCachedExecutorEntry(
    genomeFactoryOptions,
    context,
    { cache: false }
  )

  // evaluate the genome
  let fitness: number

  // allow for different types of executors and environments
  if (isAsync || environment.isAsync) {
    fitness = await environment.evaluateAsync(executor, rng)
  } else {
    fitness = environment.evaluate(executor as SyncExecutor, rng)
  }

  return fitness
}
