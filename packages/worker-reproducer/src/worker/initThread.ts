import { StateType, type InitReproducerPayload } from '../actions.js'
import { WorkerState } from '../WorkerState.js'

import { setCPPNStateRedirect } from './customState/setCPPNStateRedirect.js'
import type { ReproducerHandlerContext } from './ThreadContext.js'

export const initThread = async (
  payload: InitReproducerPayload<any, any>,
  context: ReproducerHandlerContext
) => {
  const stateProvider = new WorkerState<any, any, any, any, any>(
    setCPPNStateRedirect,
    context,
    StateType.NEAT,
    null,
    payload.reproducerOptions.enableCustomState,
    payload.genomeOptions.singleCPPNState
  )

  const { createConfig, createGenome } = await import(
    /* @vite-ignore */ payload.algorithmPathname
  )

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

  // Return null to signal success - Handler will automatically send response
  return null
}
