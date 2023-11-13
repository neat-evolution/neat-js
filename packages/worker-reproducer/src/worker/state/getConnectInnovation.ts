import type { NodeKey } from '@neat-evolution/core'
import { workerContext } from '@neat-evolution/worker-threads'

import {
  StateType,
  type InnovationPayload,
  createAction,
  ActionType,
} from '../../WorkerAction.js'
import type { ThreadContext } from '../ThreadContext.js'

export const getConnectInnovation = async (
  from: NodeKey,
  to: NodeKey,
  stateType: StateType = StateType.NEAT,
  stateKey: string | null = null,
  context: ThreadContext
): Promise<number> => {
  const requestId = context.nextRequestId()
  if (stateType === StateType.UNIQUE_CPPN_STATES) {
    await Promise.all(Array.from(context.blockingRequests))
  }
  const data = await new Promise<InnovationPayload>((resolve, reject) => {
    context.requestMap.set(requestId, {
      resolve,
      reject,
    })
    if (workerContext == null) {
      throw new Error('Worker must be created with a parent port')
    }
    workerContext.postMessage(
      createAction(ActionType.REQUEST_CONNECT_INNOVATION, {
        requestId,
        from,
        to,
        stateType,
        stateKey,
      })
    )
  })
  return data.innovation
}
