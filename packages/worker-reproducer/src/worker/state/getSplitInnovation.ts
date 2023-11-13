import type { Innovation } from '@neat-evolution/core'
import { workerContext } from '@neat-evolution/worker-threads'

import {
  StateType,
  type RespondSplitInnovationPayload,
  createAction,
  ActionType,
} from '../../WorkerAction.js'
import type { ThreadContext } from '../ThreadContext.js'

export const getSplitInnovation = async (
  linkInnovation: number,
  stateType: StateType = StateType.NEAT,
  stateKey: string | null = null,
  context: ThreadContext
): Promise<Innovation> => {
  const requestId = context.nextRequestId()
  if (stateType === StateType.UNIQUE_CPPN_STATES) {
    await Promise.all(context.blockingRequests)
  }
  const data = await new Promise<RespondSplitInnovationPayload>(
    (resolve, reject) => {
      context.requestMap.set(requestId, {
        resolve,
        reject,
      })
      if (workerContext == null) {
        throw new Error('Worker must be created with a parent port')
      }
      workerContext.postMessage(
        createAction(ActionType.REQUEST_SPLIT_INNOVATION, {
          requestId,
          innovation: linkInnovation,
          stateType,
          stateKey,
        })
      )
    }
  )
  return data
}
