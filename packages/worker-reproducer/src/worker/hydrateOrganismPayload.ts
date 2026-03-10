import { Organism } from '@neat-evolution/evolution'

import type { OrganismPayload } from '../actions.js'
import type { ReproducerHandlerContext } from './ThreadContext.js'

export const hydrateOrganismPayload = (
  payload: OrganismPayload,
  context: ReproducerHandlerContext
): Organism => {
  if (context.threadInfo == null) {
    throw new Error('hydrateOrganismPayload threadInfo not initialized')
  }

  const genome = context.threadInfo.algorithm.createGenome(
    context.threadInfo.configProvider,
    context.threadInfo.stateProvider,
    context.threadInfo.genomeOptions,
    context.threadInfo.initConfig,
    payload.genome
  )

  return new Organism(
    genome,
    payload.organismState.generation,
    payload.organismState
  )
}
