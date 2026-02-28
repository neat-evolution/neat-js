import { Organism } from '@neat-evolution/evolution'

import {
  type OrganismPayload,
  requestPopulationTournamentSelect,
} from '../actions.js'

import type { ReproducerHandlerContext } from './ThreadContext.js'

export const populationTournamentSelect = async (
  context: ReproducerHandlerContext
): Promise<Organism<any>> => {
  if (context.threadInfo == null) {
    throw new Error('populationTournamentSelect threadInfo not initialized')
  }

  // Use Handler's request method instead of manual promise tracking
  const data = await context.request<OrganismPayload<any>>(
    requestPopulationTournamentSelect({})
  )

  const genome = context.threadInfo.algorithm.createGenome(
    context.threadInfo.configProvider,
    context.threadInfo.stateProvider,
    context.threadInfo.genomeOptions,
    context.threadInfo.initConfig,
    data.genome
  )
  const organism = new Organism(
    genome,
    data.organismState.generation,
    data.organismState
  )
  return organism
}
