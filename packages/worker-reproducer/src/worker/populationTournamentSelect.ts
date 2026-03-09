import { Organism } from '@neat-evolution/evolution'

import {
  type OrganismBatchPayload,
  type OrganismPayload,
  requestPopulationTournamentSelect,
  requestPopulationTournamentSelectBatch,
} from '../actions.js'

import type { ReproducerHandlerContext } from './ThreadContext.js'

export const populationTournamentSelect = async (
  context: ReproducerHandlerContext
): Promise<Organism> => {
  if (context.threadInfo == null) {
    throw new Error('populationTournamentSelect threadInfo not initialized')
  }

  // Batch-fetch and drain a small local cache. This materially reduces
  // tournament-selection RPC traffic under worker load.
  let cache = context.populationSelectionCache
  if (cache == null) {
    cache = []
    context.populationSelectionCache = cache
  }
  const cached = cache.pop()
  if (cached != null) {
    const genome = context.threadInfo.algorithm.createGenome(
      context.threadInfo.configProvider,
      context.threadInfo.stateProvider,
      context.threadInfo.genomeOptions,
      context.threadInfo.initConfig,
      cached.genome
    )
    const organism = new Organism(
      genome,
      cached.organismState.generation,
      cached.organismState
    )
    return organism
  }

  const threadCount = Math.max(
    1,
    context.threadInfo.reproducerOptions?.threadCount ?? 1
  )
  const populationSize = Math.max(
    1,
    context.threadInfo.populationOptions.populationSize
  )
  const rawBatchSize = Math.ceil(populationSize / threadCount)
  const batchSize = Math.max(4, Math.min(16, rawBatchSize))

  const batchData = await context.request<OrganismBatchPayload>(
    requestPopulationTournamentSelectBatch({
      count: batchSize,
    })
  )

  const payloads = batchData.organisms
  if (payloads.length === 0) {
    const fallback = await context.request<OrganismPayload>(
      requestPopulationTournamentSelect({})
    )
    payloads.push(fallback)
  }

  for (let i = 0; i < payloads.length; i++) {
    cache.push(payloads[i] as OrganismPayload)
  }
  const selected = cache.pop()
  if (selected == null) {
    throw new Error('population tournament batch returned no organisms')
  }
  const genome = context.threadInfo.algorithm.createGenome(
    context.threadInfo.configProvider,
    context.threadInfo.stateProvider,
    context.threadInfo.genomeOptions,
    context.threadInfo.initConfig,
    selected.genome
  )
  const organism = new Organism(
    genome,
    selected.organismState.generation,
    selected.organismState
  )
  return organism
}
