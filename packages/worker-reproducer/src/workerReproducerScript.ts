import {
  nodeRefToKey,
  type ConfigData,
  type ConfigFactory,
  type GenomeFactory,
  type GenomeOptions,
  type Innovation,
  type NodeRef,
  type InitConfig,
  type ConfigOptions,
} from '@neat-js/core'
import { Organism } from '@neat-js/evolution'
import type { PopulationOptions } from '@neat-js/evolution'
import { threadRNG } from '@neat-js/utils'
import { workerContext } from '@neat-js/worker-threads'

import type { RequestMapValue } from './types.js'
import { ActionType, createAction } from './WorkerAction.js'
import type {
  Action,
  InitReproducerPayload,
  InnovationPayload,
  OrganismPayload,
  RespondSplitInnovationPayload,
  SpeciesPayload,
} from './WorkerAction.js'
import { WorkerState } from './WorkerState.js'

// FIXME: types
interface PartialAlgorithm {
  createConfig: ConfigFactory<any, any, any>
  createGenome: GenomeFactory<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >
}

// FIXME: types
interface ThreadInfo<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  GO extends GenomeOptions
> {
  populationOptions: PopulationOptions
  stateProvider: WorkerState<any, any, any, any, any>
  configProvider: ConfigData<NCO, LCO>
  genomeOptions: GO
  initConfig: InitConfig
  algorithm: PartialAlgorithm
}

const rng = threadRNG()

let threadInfo: ThreadInfo<any, any, any> | null = null

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

const initThread = async (payload: InitReproducerPayload<any, any, any>) => {
  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }
  // FIXME: enable node state and link state
  const stateProvider = new WorkerState<any, any, any, any, any>(
    getSplitInnovation,
    getConnectInnovation
  )
  const { createConfig, createGenome } = await import(payload.algorithmPathname)
  const configProvider = createConfig(
    payload.configData.neat,
    payload.configData.node,
    payload.configData.link
  )
  threadInfo = {
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

const populationTournamentSelect = async (): Promise<
  Organism<any, any, any, any, any, any, any, any>
> => {
  if (threadInfo == null) {
    throw new Error('threadInfo not initialized')
  }
  const requestId = nextRequestId()
  const data = await new Promise<OrganismPayload<any>>((resolve, reject) => {
    requestMap.set(requestId, {
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
  const genome = threadInfo.algorithm.createGenome(
    threadInfo.configProvider,
    threadInfo.stateProvider,
    threadInfo.genomeOptions,
    threadInfo.initConfig,
    data.genome
  )
  const organism = new Organism(
    genome,
    data.organismState.generation,
    data.organismState
  )
  return organism
}

const speciesTournamentSelect = async (
  speciesId: number
): Promise<Organism<any, any, any, any, any, any, any, any>> => {
  if (threadInfo == null) {
    throw new Error('threadInfo not initialized')
  }
  const requestId = nextRequestId()
  const data = await new Promise<OrganismPayload<any>>((resolve, reject) => {
    requestMap.set(requestId, {
      resolve,
      reject,
    })
    if (workerContext == null) {
      throw new Error('Worker must be created with a parent port')
    }
    workerContext.postMessage(
      createAction(ActionType.REQUEST_SPECIES_TOURNAMENT_SELECT, {
        requestId,
        speciesId,
      })
    )
  })
  const genome = threadInfo.algorithm.createGenome(
    threadInfo.configProvider,
    threadInfo.stateProvider,
    threadInfo.genomeOptions,
    threadInfo.initConfig,
    data.genome
  )
  const organism = new Organism(
    genome,
    data.organismState.generation,
    data.organismState
  )
  return organism
}

const getSplitInnovation = async (
  linkInnovation: number
): Promise<Innovation> => {
  const requestId = nextRequestId()
  const data = await new Promise<RespondSplitInnovationPayload>(
    (resolve, reject) => {
      requestMap.set(requestId, {
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
        })
      )
    }
  )
  return data
}

const getConnectInnovation = async (
  from: NodeRef,
  to: NodeRef
): Promise<number> => {
  const requestId = nextRequestId()
  const data = await new Promise<InnovationPayload>((resolve, reject) => {
    requestMap.set(requestId, {
      resolve,
      reject,
    })
    if (workerContext == null) {
      throw new Error('Worker must be created with a parent port')
    }
    workerContext.postMessage(
      createAction(ActionType.REQUEST_CONNECT_INNOVATION, {
        requestId,
        from: nodeRefToKey(from),
        to: nodeRefToKey(to),
      })
    )
  })
  return data.innovation
}

const eliteOrganism = (payload: OrganismPayload<any>) => {
  if (threadInfo == null) {
    throw new Error('threadInfo not initialized')
  }

  const genome = threadInfo.algorithm.createGenome(
    threadInfo.configProvider,
    threadInfo.stateProvider,
    threadInfo.genomeOptions,
    threadInfo.initConfig,
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

const breedOrganism = async (payload: SpeciesPayload) => {
  if (threadInfo == null) {
    throw new Error('threadInfo not initialized')
  }
  const father =
    rng.gen() < threadInfo.populationOptions.interspeciesReproductionProbability
      ? await populationTournamentSelect() // Interspecies breeding
      : await speciesTournamentSelect(payload.speciesId) // Breeding within species

  if (father == null) {
    throw new Error('Unable to gather father organism')
  }

  let child: Organism<any, any, any, any, any, any, any, any>
  if (rng.gen() < threadInfo.populationOptions.asexualReproductionProbability) {
    child = father.asElite()
  } else {
    const mother = await speciesTournamentSelect(payload.speciesId)
    if (mother == null) {
      throw new Error('Unable to gather mother organism')
    }
    child = mother.crossover(father)
  }

  await child.mutate()

  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }

  workerContext.postMessage(
    createAction(ActionType.RESPOND_BREED_ORGANISM, {
      requestId: payload.requestId,
      genome: child.genome.toFactoryOptions(),
      organismState: child.toFactoryOptions(),
    })
  )
}

const handleResponse = (payload: any) => {
  const { requestId } = payload
  const { resolve } = requestMap.get(requestId) ?? {}
  if (resolve == null) {
    throw new Error('no request found')
  }
  resolve(payload)
}

const handleTerminate = () => {
  console.debug('Terminating worker')
}

const handleError = (error: Error) => {
  console.error('Error in worker:', error)
}

if (workerContext !== null) {
  workerContext.addEventListener('message', (action: Action<ActionType>) => {
    switch (action.type) {
      case ActionType.INIT_REPRODUCER:
        initThread(
          action.payload as InitReproducerPayload<any, any, any>
        ).catch(handleError)
        break
      case ActionType.REQUEST_ELITE_ORGANISM:
        eliteOrganism(action.payload as OrganismPayload<any>)
        break
      case ActionType.REQUEST_BREED_ORGANISM:
        breedOrganism(action.payload as SpeciesPayload).catch(handleError)
        break
      case ActionType.RESPOND_POPULATION_TOURNAMENT_SELECT:
        handleResponse(action.payload)
        break
      case ActionType.RESPOND_SPECIES_TOURNAMENT_SELECT:
        handleResponse(action.payload)
        break
      case ActionType.RESPOND_SPLIT_INNOVATION:
        handleResponse(action.payload)
        break
      case ActionType.RESPOND_CONNECT_INNOVATION:
        handleResponse(action.payload)
        break
      case ActionType.TERMINATE:
        handleTerminate()
        break
      default:
        console.error(`Unknown action type: ${action.type}`)
    }
  })
}
