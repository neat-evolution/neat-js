import type { Executor, SyncExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type { WorkerContext } from '@neat-evolution/worker-actions'

import { type EvaluateBatchPayload } from '../actions.js'

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

  const { configProvider, stateProvider, genomeOptions, initConfig } =
    context.genomeFactoryConfig

  const { createGenome, createPhenotype, createExecutor, environment } =
    context.threadInfo

  // Hydrate all genomes
  const executors: Executor[] = batchGenomeOptions.map((options) => {
    const genome = createGenome(
      configProvider,
      stateProvider,
      genomeOptions,
      initConfig,
      options
    )
    const phenotype = createPhenotype(genome)
    return createExecutor(phenotype)
  })

  // Determine async
  const isAsync = executors.some((e) => e.isAsync) || environment.isAsync

  // Call batch method
  let fitnessScores: number[]
  if (isAsync) {
    fitnessScores = await environment.evaluateBatchAsync(executors, rng)
  } else {
    fitnessScores = environment.evaluateBatch(executors as SyncExecutor[], rng)
  }

  return fitnessScores
}
