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
import { createMessage } from '@neat-evolution/worker-actions'

import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export enum ActionType {
  INIT_REPRODUCER = 'INIT_REPRODUCER',
  TERMINATE = 'TERMINATE',

  REQUEST_ELITE_ORGANISM = 'REQUEST_ELITE_ORGANISM',
  REQUEST_BREED_ORGANISM = 'REQUEST_BREED_ORGANISM',
  REQUEST_REPRODUCE_BATCH = 'REQUEST_REPRODUCE_BATCH',
  REQUEST_POPULATION_SNAPSHOT = 'REQUEST_POPULATION_SNAPSHOT',

  // get father/mother
  REQUEST_POPULATION_TOURNAMENT_SELECT = 'REQUEST_POPULATION_TOURNAMENT_SELECT',
  REQUEST_SPECIES_TOURNAMENT_SELECT = 'REQUEST_SPECIES_TOURNAMENT_SELECT',

  // custom state
  REQUEST_SET_CPPN_STATE_REDIRECT = 'REQUEST_SET_CPPN_STATE_REDIRECT',
}

export interface InitReproducerPayload<
  CD extends ConfigData = ConfigData,
  GO extends GenomeOptions = GenomeOptions,
> {
  workerIndex: number
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

export interface OrganismPayload<
  GFO extends GenomeFactoryOptions = GenomeFactoryOptions,
> {
  genome: GFO
  organismState: OrganismFactoryOptions
}

export interface SpeciesPayload {
  speciesId: number
}

export interface OrganismBatchPayload<
  GFO extends GenomeFactoryOptions = GenomeFactoryOptions,
> {
  organisms: Array<OrganismPayload<GFO>>
}

export interface ReproductionSpeciesPayload<
  GFO extends GenomeFactoryOptions = GenomeFactoryOptions,
> {
  speciesId: number
  reproductions: number
  organisms: Array<OrganismPayload<GFO>>
}

export interface ReproduceBatchPayload<
  GFO extends GenomeFactoryOptions = GenomeFactoryOptions,
> {
  species: Array<ReproductionSpeciesPayload<GFO>>
}

export interface CPPNStateRedirectPayload {
  key: LinkKey
  oldKey: LinkKey
}

// Action creators for worker-reproducer
export const initReproducer = createMessage<InitReproducerPayload, null>(
  ActionType.INIT_REPRODUCER
)

export const terminate = createMessage<null, null>(
  ActionType.TERMINATE,
  () => null
)

export const requestEliteOrganism = createMessage<
  OrganismPayload,
  OrganismPayload
>(ActionType.REQUEST_ELITE_ORGANISM)

export const requestBreedOrganism = createMessage<
  SpeciesPayload,
  OrganismPayload
>(ActionType.REQUEST_BREED_ORGANISM)

export const requestReproduceBatch = createMessage<
  ReproduceBatchPayload,
  OrganismBatchPayload
>(ActionType.REQUEST_REPRODUCE_BATCH)

export const requestPopulationSnapshot = createMessage<
  EmptyPayload,
  OrganismBatchPayload
>(ActionType.REQUEST_POPULATION_SNAPSHOT)

export const requestPopulationTournamentSelect = createMessage<
  EmptyPayload,
  OrganismPayload
>(ActionType.REQUEST_POPULATION_TOURNAMENT_SELECT)

export const requestSpeciesTournamentSelect = createMessage<
  SpeciesPayload,
  OrganismPayload
>(ActionType.REQUEST_SPECIES_TOURNAMENT_SELECT)

export const requestSetCPPNStateRedirect = createMessage<
  CPPNStateRedirectPayload,
  EmptyPayload
>(ActionType.REQUEST_SET_CPPN_STATE_REDIRECT)
