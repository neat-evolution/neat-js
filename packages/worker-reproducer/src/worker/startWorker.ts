import { threadRNG } from '@neat-evolution/utils'
import { workerContext } from '@neat-evolution/worker-threads'

import type { RequestMapValue } from '../types.js'
import {
  ActionType,
  type Action,
  type InitReproducerPayload,
  type OrganismPayload,
  type SpeciesPayload,
} from '../WorkerAction.js'

import { breedOrganism } from './breedOrganism.js'
import { eliteOrganism } from './eliteOrganism.js'
import { handleResponse } from './handleResponse.js'
import { initThread } from './initThread.js'
import type { ThreadContext, ThreadInfo } from './ThreadContext.js'

const handleTerminate = () => {
  console.debug('Terminating worker')
}

const handleError = (error: Error) => {
  console.error('Error in worker:', error)
}

export const startWorker = () => {
  const rng = threadRNG()

  const threadInfo: ThreadInfo<any, any> | null = null

  let threadRequestId = 0
  const nextRequestId = () => {
    const id = threadRequestId++
    // FIXME: what is a good rollover value?
    if (id === 1_000) {
      threadRequestId = 0
    }
    return id
  }

  const requestMap = new Map<number, RequestMapValue<any>>()

  const blockingRequests = new Set<Promise<any>>()

  const context: ThreadContext = {
    blockingRequests,
    nextRequestId,
    requestMap,
    rng,
    threadInfo,
  }

  if (workerContext !== null) {
    workerContext.addEventListener('message', (action: Action<ActionType>) => {
      switch (action.type) {
        case ActionType.INIT_REPRODUCER:
          initThread(
            action.payload as InitReproducerPayload<any, any>,
            context
          ).catch(handleError)
          break
        case ActionType.REQUEST_ELITE_ORGANISM:
          eliteOrganism(action.payload as OrganismPayload<any>, context)
          break
        case ActionType.REQUEST_BREED_ORGANISM:
          breedOrganism(action.payload as SpeciesPayload, context).catch(
            handleError
          )
          break
        case ActionType.RESPOND_POPULATION_TOURNAMENT_SELECT:
          handleResponse(action.payload, requestMap)
          break
        case ActionType.RESPOND_SPECIES_TOURNAMENT_SELECT:
          handleResponse(action.payload, requestMap)
          break
        case ActionType.RESPOND_SPLIT_INNOVATION:
          handleResponse(action.payload, requestMap)
          break
        case ActionType.RESPOND_CONNECT_INNOVATION:
          handleResponse(action.payload, requestMap)
          break
        case ActionType.RESPOND_SET_CPPN_STATE_REDIRECT:
          handleResponse(action.payload, requestMap)
          break
        case ActionType.TERMINATE:
          handleTerminate()
          break
        default:
          console.error(`Unknown action type: ${action.type}`)
      }
    })
  }
}
