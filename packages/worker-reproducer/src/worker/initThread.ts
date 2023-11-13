import { workerContext } from '@neat-evolution/worker-threads'

import {
  StateType,
  type InitReproducerPayload,
  createAction,
  ActionType,
} from '../WorkerAction.js'
import { WorkerState } from '../WorkerState.js'

import { setCPPNStateRedirect } from './customState/setCPPNStateRedirect.js'
import { getConnectInnovation } from './state/getConnectInnovation.js'
import { getSplitInnovation } from './state/getSplitInnovation.js'
import type { ThreadContext } from './ThreadContext.js'

export const initThread = async (
  payload: InitReproducerPayload<any, any>,
  context: ThreadContext
) => {
  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }

  const stateProvider = new WorkerState<any, any, any, any, any>(
    getSplitInnovation,
    getConnectInnovation,
    setCPPNStateRedirect,
    context,
    StateType.NEAT,
    null,
    payload.reproducerOptions.enableCustomState,
    payload.genomeOptions.singleCPPNState
  )
  const { createConfig, createGenome } = await import(payload.algorithmPathname)
  const configProvider = createConfig(payload.configData)
  context.threadInfo = {
    reproducerOptions: payload.reproducerOptions,
    populationOptions: payload.populationOptions,
    stateProvider,
    configProvider,
    genomeOptions: payload.genomeOptions,
    initConfig: payload.initConfig,
    algorithm: {
      createConfig,
      createGenome,
    },
  }
  workerContext.postMessage(
    createAction(ActionType.INIT_REPRODUCER_SUCCESS, null)
  )
}
