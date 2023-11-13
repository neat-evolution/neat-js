import { Organism } from '@neat-evolution/evolution'
import { workerContext } from '@neat-evolution/worker-threads'

import {
  ActionType,
  createAction,
  type OrganismPayload,
} from '../WorkerAction.js'

import type { ThreadContext } from './ThreadContext.js'

export const eliteOrganism = (
  payload: OrganismPayload<any>,
  context: ThreadContext
) => {
  if (context.threadInfo == null) {
    throw new Error('threadInfo not initialized')
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

  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }

  workerContext.postMessage(
    createAction(ActionType.RESPOND_ELITE_ORGANISM, {
      requestId: payload.requestId,
      genome: elite.genome.toFactoryOptions(),
      organismState: elite.toFactoryOptions(),
    })
  )
}
