import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  InitConfig,
  Innovation,
  LinkKey,
} from '@neat-js/core'
import type {
  OrganismFactoryOptions,
  PopulationOptions,
} from '@neat-js/evolution'

import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export enum ActionType {
  INIT_REPRODUCER = 'INIT_REPRODUCER',
  INIT_REPRODUCER_SUCCESS = 'INIT_REPRODUCER_SUCCESS',
  TERMINATE = 'TERMINATE',

  REQUEST_ELITE_ORGANISM = 'REQUEST_ELITE_ORGANISM',
  RESPOND_ELITE_ORGANISM = 'RESPOND_ELITE_ORGANISM',
  REQUEST_BREED_ORGANISM = 'REQUEST_BREED_ORGANISM',
  RESPOND_BREED_ORGANISM = 'RESPOND_BREED_ORGANISM',

  // get father/mother
  REQUEST_POPULATION_TOURNAMENT_SELECT = 'REQUEST_POPULATION_TOURNAMENT_SELECT',
  RESPOND_POPULATION_TOURNAMENT_SELECT = 'RESPOND_POPULATION_TOURNAMENT_SELECT',
  REQUEST_SPECIES_TOURNAMENT_SELECT = 'REQUEST_SPECIES_TOURNAMENT_SELECT',
  RESPOND_SPECIES_TOURNAMENT_SELECT = 'RESPOND_SPECIES_TOURNAMENT_SELECT',

  // mutate child
  REQUEST_SPLIT_INNOVATION = 'REQUEST_SPLIT_INNOVATION',
  RESPOND_SPLIT_INNOVATION = 'RESPOND_SPLIT_INNOVATION',
  REQUEST_CONNECT_INNOVATION = 'REQUEST_CONNECT_INNOVATION',
  RESPOND_CONNECT_INNOVATION = 'RESPOND_CONNECT_INNOVATION',

  // custom state
  REQUEST_SET_CPPN_STATE_REDIRECT = 'REQUEST_SET_CPPN_STATE_REDIRECT',
  RESPOND_SET_CPPN_STATE_REDIRECT = 'RESPOND_SET_CPPN_STATE_REDIRECT',
}

export interface InitReproducerPayload<
  CD extends ConfigData,
  GO extends GenomeOptions
> {
  reproducerOptions: WorkerReproducerOptions
  populationOptions: PopulationOptions
  configData: CD
  genomeOptions: GO
  initConfig: InitConfig
  algorithmPathname: string
}

export interface InnovationPayload {
  requestId: number
  innovation: number
}

/** enables custom state */
export enum StateType {
  /** state.neat() */
  NEAT,
  /** state.custom.singeCPPNState */
  SINGLE_CPPN_STATE,
  /** state.custom.uniqueCPPNStates.get(key) */
  UNIQUE_CPPN_STATES,
}

export interface RequestSplitInnovationPayload {
  requestId: number
  innovation: number
  /** enables custom state */
  stateType: StateType
  /** only used for UNIQUE_CPPN_STATES; state.custom.uniqueCPPNStates.get(key) */
  stateKey: string | null
}

export interface RequestConnectInnovationPayload {
  requestId: number
  from: string
  to: string
  /** enables custom state */
  stateType: StateType
  /** only used for UNIQUE_CPPN_STATES; state.custom.uniqueCPPNStates.get(key) */
  stateKey: string | null
}

export interface RespondSplitInnovationPayload extends Innovation {
  requestId: number
}

export interface EmptyPayload {
  requestId: number
}

export interface OrganismPayload<GFO extends GenomeFactoryOptions<any, any>> {
  requestId: number
  genome: GFO
  organismState: OrganismFactoryOptions
}

export interface SpeciesPayload {
  requestId: number
  speciesId: number
}

export interface CPPNStateRedirectPayload {
  requestId: number
  key: LinkKey
  oldKey: LinkKey
}

export interface PayloadMap {
  [ActionType.INIT_REPRODUCER]: InitReproducerPayload<any, any>
  [ActionType.INIT_REPRODUCER_SUCCESS]: null
  [ActionType.TERMINATE]: null
  [ActionType.REQUEST_ELITE_ORGANISM]: OrganismPayload<any>
  [ActionType.RESPOND_ELITE_ORGANISM]: OrganismPayload<any>
  [ActionType.REQUEST_BREED_ORGANISM]: SpeciesPayload
  [ActionType.RESPOND_BREED_ORGANISM]: OrganismPayload<any>
  [ActionType.REQUEST_POPULATION_TOURNAMENT_SELECT]: EmptyPayload
  [ActionType.RESPOND_POPULATION_TOURNAMENT_SELECT]: OrganismPayload<any>
  [ActionType.REQUEST_SPECIES_TOURNAMENT_SELECT]: SpeciesPayload
  [ActionType.RESPOND_SPECIES_TOURNAMENT_SELECT]: OrganismPayload<any>
  [ActionType.REQUEST_SPLIT_INNOVATION]: RequestSplitInnovationPayload
  [ActionType.RESPOND_SPLIT_INNOVATION]: RespondSplitInnovationPayload
  [ActionType.REQUEST_CONNECT_INNOVATION]: RequestConnectInnovationPayload
  [ActionType.RESPOND_CONNECT_INNOVATION]: InnovationPayload
  [ActionType.REQUEST_SET_CPPN_STATE_REDIRECT]: CPPNStateRedirectPayload
  [ActionType.RESPOND_SET_CPPN_STATE_REDIRECT]: EmptyPayload
}

export interface Action<T extends ActionType> {
  type: T
  payload: PayloadMap[T]
}

export const createAction = <T extends ActionType>(
  type: T,
  payload: PayloadMap[T]
): Action<T> => {
  return {
    type,
    payload,
  }
}
