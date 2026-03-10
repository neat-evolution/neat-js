import type {
  ConfigFactory,
  ConfigProvider,
  GenomeFactory,
  GenomeOptions,
  InitConfig,
} from '@neat-evolution/core'
import type { PopulationOptions } from '@neat-evolution/evolution'
import type { RNG } from '@neat-evolution/utils'
import type { WorkerContext } from '@neat-evolution/worker-actions'
import type QuickLRU from 'quick-lru'
import type { OrganismPayload } from '../actions.js'
import type { WorkerReproducerOptions } from '../WorkerReproducerOptions.js'
import type { WorkerState } from '../WorkerState.js'
import type { Organism } from '@neat-evolution/evolution'

export interface PartialAlgorithm {
  createConfig: ConfigFactory
  createGenome: GenomeFactory
}

export interface ThreadInfo<GO extends GenomeOptions = GenomeOptions> {
  reproducerOptions?: WorkerReproducerOptions
  populationOptions: PopulationOptions
  stateProvider: WorkerState
  configProvider: ConfigProvider
  genomeOptions: GO
  initConfig: InitConfig
  algorithm: PartialAlgorithm
}

export interface ThreadContext {
  rng: RNG
  threadInfo: ThreadInfo | null
  speciesSelectionCache: QuickLRU<number, Array<OrganismPayload>> | undefined
  populationSelectionCache: Array<OrganismPayload> | undefined
  localSpeciesOrganisms: Map<number, Array<Organism>> | undefined
  localPopulationOrganisms: Array<Organism> | undefined
  allowLazyPopulationSnapshot: boolean
}

export type ReproducerHandlerContext = ThreadContext & WorkerContext
