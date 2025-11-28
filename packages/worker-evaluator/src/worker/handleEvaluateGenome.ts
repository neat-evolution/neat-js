import type { Executor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type { WorkerContext } from '@neat-evolution/worker-actions'

import { type EvaluateGenomePayload } from '../actions.js'

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

  // hydrate the genome
  const { configProvider, stateProvider, genomeOptions, initConfig } =
    context.genomeFactoryConfig

  const { createGenome, createPhenotype, createExecutor, environment } =
    context.threadInfo

  const genome = createGenome(
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
    genomeFactoryOptions
  )

  // create the phenotype and executor
  const phenotype = createPhenotype(genome)

  const executor: Executor = createExecutor(phenotype)

  // evaluate the genome
  let fitness: number

  // allow for different types of executors and environments
  if (executor.isAsync || environment.isAsync) {
    fitness = await environment.evaluateAsync(executor, rng)
  } else {
    fitness = environment.evaluate(executor, rng)
  }

  return fitness
}
