import type {
  ConfigData,
  GenomeOptions,
  InitConfig,
  FitnessData,
  GenomeEntries,
  GenomeEntry,
} from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'

export type { FitnessData }

export interface EvaluationContext {
  evaluateSingle: (entry: GenomeEntry<any>) => Promise<FitnessData>
  evaluateBatch: (entries: Array<GenomeEntry<any>>) => Promise<FitnessData[]>
}

export interface Evaluator<EFO> {
  environment: Environment<EFO>

  initGenomeFactory: <CD extends ConfigData>(
    configData: CD,
    genomeOptions: GenomeOptions,
    initConfig: InitConfig
  ) => Promise<void>

  evaluate: (genomeEntries: GenomeEntries<any>) => AsyncIterable<FitnessData>
}
