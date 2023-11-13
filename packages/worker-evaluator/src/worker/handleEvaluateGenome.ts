import type { GenomeFactoryOptions } from '@neat-evolution/core'
import type { Executor } from '@neat-evolution/executor'
import { workerContext } from '@neat-evolution/worker-threads'

import { createWorkerAction, ActionType } from '../WorkerAction.js'

import type { ThreadContext } from './ThreadContext.js'

export type HandleEvaluateGenomeFn<O> = (
  options: O,
  threadContext: ThreadContext
) => Promise<void>

export const handleEvaluateGenome: HandleEvaluateGenomeFn<
  GenomeFactoryOptions<any, any>
> = async (genomeFactoryOptions, threadContext) => {
  if (threadContext.threadInfo == null) {
    throw new Error('threadInfo not initialized')
  }
  if (threadContext.genomeFactoryConfig == null) {
    throw new Error('genomeFactoryConfig not initialized')
  }
  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }

  // hydrate the genome
  const { configProvider, stateProvider, genomeOptions, initConfig } =
    threadContext.genomeFactoryConfig

  const { createGenome, createPhenotype, createExecutor, environment } =
    threadContext.threadInfo

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

  // allow for different types of executors
  if (executor.isAsync) {
    fitness = await environment.evaluateAsync(executor)
  } else {
    fitness = environment.evaluate(executor)
  }

  workerContext.postMessage(
    createWorkerAction(ActionType.RESPOND_EVALUATE_GENOME, fitness)
  )
}
