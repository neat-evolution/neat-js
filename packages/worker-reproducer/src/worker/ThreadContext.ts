import type {
  ConfigData,
  ConfigFactory,
  ConfigProvider,
  GenomeFactory,
  GenomeOptions,
  InitConfig,
} from '@neat-evolution/core'
import type { PopulationOptions } from '@neat-evolution/evolution'
import type { RNG } from '@neat-evolution/utils'

import type { RequestMapValue } from '../types.js'
import type { WorkerReproducerOptions } from '../WorkerReproducerOptions.js'
import type { WorkerState } from '../WorkerState.js'

export interface PartialAlgorithm {
  createConfig: ConfigFactory<any, any, any, any, any>
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
    any,
    any
  >
}

export interface ThreadInfo<CD extends ConfigData, GO extends GenomeOptions> {
  reproducerOptions?: WorkerReproducerOptions
  populationOptions: PopulationOptions
  stateProvider: WorkerState<any, any, any, any, any>
  configProvider: ConfigProvider<any, any, CD>
  genomeOptions: GO
  initConfig: InitConfig
  algorithm: PartialAlgorithm
}

export interface ThreadContext {
  blockingRequests: Set<Promise<any>>
  nextRequestId: () => number
  requestMap: Map<number, RequestMapValue<any>>
  rng: RNG
  threadInfo: ThreadInfo<any, any> | null
}
