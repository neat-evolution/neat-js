import type {
  ConfigData,
  GenomeOptions,
  InitConfig,
} from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import type { Executor, SyncExecutor } from '@neat-evolution/executor'

import type { GenomeEntries } from './GenomeEntries.js'

export type FitnessData = [
  speciesIndex: number,
  organismIndex: number,
  fitness: number
]

export interface Evaluator<
  E extends SyncExecutor[],
  EA extends Executor[],
  ER
> {
  environment: Environment<any, E, EA, ER>

  initGenomeFactory: <CD extends ConfigData>(
    configData: CD,
    genomeOptions: GenomeOptions,
    initConfig: InitConfig
  ) => Promise<void>

  evaluate: (genomeEntries: GenomeEntries<any>) => AsyncIterable<FitnessData>
}

export type StandardEvaluator = Evaluator<
  [executor: SyncExecutor],
  [executor: Executor],
  number
>
