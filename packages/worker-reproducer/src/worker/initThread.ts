import { createRNG, setThreadRNGSeed } from '@neat-evolution/utils'
import QuickLRU from 'quick-lru'
import { type InitReproducerPayload, StateType } from '../actions.js'
import { WorkerState } from '../WorkerState.js'

import { setCPPNStateRedirect } from './customState/setCPPNStateRedirect.js'
import type { ReproducerHandlerContext } from './ThreadContext.js'

const getSingleCPPNState = (
  genomeOptions: InitReproducerPayload['genomeOptions']
) =>
  'singleCPPNState' in genomeOptions &&
  typeof genomeOptions.singleCPPNState === 'boolean'
    ? genomeOptions.singleCPPNState
    : undefined

export const initThread = async (
  payload: InitReproducerPayload,
  context: ReproducerHandlerContext
) => {
  if (payload.reproducerOptions.randomSeed != null) {
    context.rng = createRNG(payload.reproducerOptions.randomSeed)
    // Seed threadRNG for legacy callers (e.g. CPPNNode.determineActivation)
    setThreadRNGSeed(payload.reproducerOptions.randomSeed)
  }

  const stateProvider = new WorkerState(
    setCPPNStateRedirect,
    context,
    StateType.NEAT,
    null,
    payload.reproducerOptions.enableCustomState,
    getSingleCPPNState(payload.genomeOptions)
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
  context.speciesSelectionCache = new QuickLRU({ maxSize: 32 })
  context.populationSelectionCache = []
  context.localSpeciesOrganisms = undefined
  context.localPopulationOrganisms = undefined
  context.allowLazyPopulationSnapshot = false

  // Return null to signal success - Handler will automatically send response
  return null
}
