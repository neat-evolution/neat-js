import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  InitConfig,
  LinkKey,
} from '@neat-evolution/core'
import type {
  OrganismFactoryOptions,
  PopulationOptions,
} from '@neat-evolution/evolution'
import { createAction } from '@neat-evolution/worker-actions'

import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export enum ActionType {
  INIT_REPRODUCER = 'INIT_REPRODUCER',
  TERMINATE = 'TERMINATE',

  REQUEST_ELITE_ORGANISM = 'REQUEST_ELITE_ORGANISM',
  REQUEST_BREED_ORGANISM = 'REQUEST_BREED_ORGANISM',

  // get father/mother
  REQUEST_POPULATION_TOURNAMENT_SELECT = 'REQUEST_POPULATION_TOURNAMENT_SELECT',
  REQUEST_SPECIES_TOURNAMENT_SELECT = 'REQUEST_SPECIES_TOURNAMENT_SELECT',

  // custom state
  REQUEST_SET_CPPN_STATE_REDIRECT = 'REQUEST_SET_CPPN_STATE_REDIRECT',
}

export interface InitReproducerPayload<
  CD extends ConfigData,
  GO extends GenomeOptions,
> {
  reproducerOptions: WorkerReproducerOptions
  populationOptions: PopulationOptions
  configData: CD
  genomeOptions: GO
  initConfig: InitConfig
  algorithmPathname: string
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

export type EmptyPayload = Record<string, never>

export interface OrganismPayload<GFO extends GenomeFactoryOptions<any, any>> {
  genome: GFO
  organismState: OrganismFactoryOptions
}

export interface SpeciesPayload {
  speciesId: number
}

export interface CPPNStateRedirectPayload {
  key: LinkKey
  oldKey: LinkKey
}

// Action creators for worker-reproducer
export const initReproducer = createAction<InitReproducerPayload<any, any>>(
  ActionType.INIT_REPRODUCER
)

export const terminate = createAction<null>(ActionType.TERMINATE, () => null)

export const requestEliteOrganism = createAction<OrganismPayload<any>>(
  ActionType.REQUEST_ELITE_ORGANISM
)

export const requestBreedOrganism = createAction<SpeciesPayload>(
  ActionType.REQUEST_BREED_ORGANISM
)

export const requestPopulationTournamentSelect = createAction<EmptyPayload>(
  ActionType.REQUEST_POPULATION_TOURNAMENT_SELECT
)

export const requestSpeciesTournamentSelect = createAction<SpeciesPayload>(
  ActionType.REQUEST_SPECIES_TOURNAMENT_SELECT
)

export const requestSetCPPNStateRedirect =
  createAction<CPPNStateRedirectPayload>(
    ActionType.REQUEST_SET_CPPN_STATE_REDIRECT
  )
