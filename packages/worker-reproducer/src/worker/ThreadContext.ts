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

import type { WorkerReproducerOptions } from '../WorkerReproducerOptions.js'
import type { WorkerState } from '../WorkerState.js'

export interface PartialAlgorithm {
  createConfig: ConfigFactory<any>
  createGenome: GenomeFactory<any>
}

export interface ThreadInfo<GO extends GenomeOptions = any> {
  reproducerOptions?: WorkerReproducerOptions
  populationOptions: PopulationOptions
  stateProvider: WorkerState<any, any, any, any, any>
  configProvider: ConfigProvider<any, any, any>
  genomeOptions: GO
  initConfig: InitConfig
  algorithm: PartialAlgorithm
}

export interface ThreadContext {
  rng: RNG
  threadInfo: ThreadInfo<any> | null
}

export type ReproducerHandlerContext = ThreadContext & WorkerContext
