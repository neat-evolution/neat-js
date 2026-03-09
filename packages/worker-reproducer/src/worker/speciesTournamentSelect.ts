import { Organism } from '@neat-evolution/evolution'
import QuickLRU from 'quick-lru'

import {
  type OrganismBatchPayload,
  type OrganismPayload,
  requestSpeciesTournamentSelect,
  requestSpeciesTournamentSelectBatch,
} from '../actions.js'

import type { ReproducerHandlerContext } from './ThreadContext.js'

export const speciesTournamentSelect = async (
  speciesId: number,
  context: ReproducerHandlerContext
): Promise<Organism> => {
  if (context.threadInfo == null) {
    throw new Error('speciesTournamentSelect threadInfo not initialized')
  }

  // Keep a small per-species cache because repeat selection requests hit often
  // enough to outweigh the extra memory and bookkeeping.
  let cacheBySpecies = context.speciesSelectionCache
  if (cacheBySpecies == null) {
    cacheBySpecies = new QuickLRU({
      maxSize: 32,
    })
    context.speciesSelectionCache = cacheBySpecies
  }
  let cache = cacheBySpecies.get(speciesId)
  if (cache == null) {
    cache = []
    cacheBySpecies.set(speciesId, cache)
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
    requestSpeciesTournamentSelectBatch({
      speciesId,
      count: batchSize,
    })
  )

  const payloads = batchData.organisms
  if (payloads.length === 0) {
    const fallback = await context.request<OrganismPayload>(
      requestSpeciesTournamentSelect({
        speciesId,
      })
    )
    payloads.push(fallback)
  }

  for (let i = 0; i < payloads.length; i++) {
    cache.push(payloads[i] as OrganismPayload)
  }
  const selected = cache.pop()
  if (selected == null) {
    throw new Error('species tournament batch returned no organisms')
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
