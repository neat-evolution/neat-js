import { Organism } from '@neat-evolution/evolution'
import { workerContext } from '@neat-evolution/worker-threads'

import {
  ActionType,
  createAction,
  type OrganismPayload,
} from '../WorkerAction.js'

import type { ThreadContext } from './ThreadContext.js'

export const populationTournamentSelect = async (
  context: ThreadContext
): Promise<Organism<any, any, any, any, any, any, any>> => {
  if (context.threadInfo == null) {
    throw new Error('threadInfo not initialized')
  }
  const requestId = context.nextRequestId()
  const data = await new Promise<OrganismPayload<any>>((resolve, reject) => {
    context.requestMap.set(requestId, {
      resolve,
      reject,
    })
    if (workerContext == null) {
      throw new Error('Worker must be created with a parent port')
    }
    workerContext.postMessage(
      createAction(ActionType.REQUEST_POPULATION_TOURNAMENT_SELECT, {
        requestId,
      })
    )
  })
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
