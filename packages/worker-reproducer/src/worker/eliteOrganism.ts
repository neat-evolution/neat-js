import { Organism } from '@neat-evolution/evolution'

import type { OrganismPayload } from '../actions.js'

import type { ReproducerHandlerContext } from './ThreadContext.js'

export const eliteOrganism = (
  payload: OrganismPayload<any>,
  context: ReproducerHandlerContext
) => {
  if (context.threadInfo == null) {
    throw new Error('eliteOrganism threadInfo not initialized')
  }

  const genome = context.threadInfo.algorithm.createGenome(
    context.threadInfo.configProvider,
    context.threadInfo.stateProvider,
    context.threadInfo.genomeOptions,
    context.threadInfo.initConfig,
    payload.genome
  )
  const organism = new Organism(
    genome,
    payload.organismState.generation,
    payload.organismState
  )
  const elite = organism.asElite()

  const responsePayload = {
    genome: elite.genome.toFactoryOptions(),
    organismState: elite.toFactoryOptions(),
  }

  // Return the payload directly - Handler will automatically send RPC response
  return responsePayload
}
