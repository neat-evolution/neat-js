import type { GenomeFactoryOptions } from '@neat-evolution/core'
import type { Executor } from '@neat-evolution/executor'

import type { ThreadContext } from './ThreadContext.js'

export interface CachedExecutorEntry {
  executor: Executor
  isAsync: boolean
}

function toCacheKey(genomeFactoryOptions: GenomeFactoryOptions): string {
  return JSON.stringify(genomeFactoryOptions)
}

export const createCachedExecutorEntry = (
  genomeFactoryOptions: GenomeFactoryOptions,
  context: ThreadContext,
  options: {
    cache: boolean
  }
): CachedExecutorEntry => {
  if (context.threadInfo == null) {
    throw new Error('createCachedExecutorEntry threadInfo not initialized')
  }
  if (context.genomeFactoryConfig == null) {
    throw new Error('genomeFactoryConfig not initialized')
  }

  const key = toCacheKey(genomeFactoryOptions)
  const cached = options.cache ? context.executorCache?.get(key) : undefined
  if (cached != null) {
    return cached
  }

  const { configProvider, stateProvider, genomeOptions, initConfig } =
    context.genomeFactoryConfig
  const { createGenome, createPhenotype, createExecutor } = context.threadInfo

  const genome = createGenome(
    configProvider,
    stateProvider as never,
    genomeOptions,
    initConfig,
    genomeFactoryOptions
  )
  const phenotype = createPhenotype(genome as never)
  const executor = createExecutor(phenotype)
  const created = {
    executor,
    isAsync: executor.isAsync,
  }
  if (options.cache) {
    context.executorCache?.set(key, created)
  }
  return created
}
