import type { LinkKey } from '@neat-evolution/core'
import { workerContext } from '@neat-evolution/worker-threads'

import {
  ActionType,
  createAction,
  type EmptyPayload,
} from '../../WorkerAction.js'
import type { ThreadContext } from '../ThreadContext.js'

export const setCPPNStateRedirect = (
  key: LinkKey,
  oldKey: LinkKey,
  context: ThreadContext
): void => {
  const requestId = context.nextRequestId()

  const response = new Promise<EmptyPayload>((resolve, reject) => {
    context.requestMap.set(requestId, {
      resolve,
      reject,
    })
    if (workerContext == null) {
      throw new Error('Worker must be created with a parent port')
    }
    workerContext.postMessage(
      createAction(ActionType.REQUEST_SET_CPPN_STATE_REDIRECT, {
        requestId,
        key,
        oldKey,
      })
    )
  })
  context.blockingRequests.add(
    response.then(() => {
      context.blockingRequests.delete(response)
    })
  )
}
