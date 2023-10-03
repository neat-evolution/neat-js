import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  Innovation,
  LinkConfig,
  NodeConfig,
} from '@neat-js/core'
import type {
  OrganismFactoryOptions,
  PopulationOptions,
} from '@neat-js/evolution'

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
}

export interface InitReproducerPayload<
  NC extends NodeConfig,
  LC extends LinkConfig,
  GO extends GenomeOptions
> {
  populationOptions: PopulationOptions
  configData: ConfigData<NC, LC>
  genomeOptions: GO
  algorithmPathname: string
}

export interface InnovationPayload {
  requestId: number
  innovation: number
}

export interface RequestConnectInnovationPayload {
  requestId: number
  from: string
  to: string
}

export interface RespondSplitInnovationPayload extends Innovation {
  requestId: number
}

export interface EmptyPayload {
  requestId: number
}

export interface OrganismPayload<
  GFO extends GenomeFactoryOptions<any, any, any, any, any, any>
> {
  requestId: number
  genome: GFO
  organismState: OrganismFactoryOptions
}

export interface SpeciesPayload {
  requestId: number
  speciesId: number
}

export interface PayloadMap {
  [ActionType.INIT_REPRODUCER]: InitReproducerPayload<any, any, any>
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
  [ActionType.REQUEST_SPLIT_INNOVATION]: InnovationPayload
  [ActionType.RESPOND_SPLIT_INNOVATION]: RespondSplitInnovationPayload
  [ActionType.REQUEST_CONNECT_INNOVATION]: RequestConnectInnovationPayload
  [ActionType.RESPOND_CONNECT_INNOVATION]: InnovationPayload
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
