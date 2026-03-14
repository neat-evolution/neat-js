import type {
  AnyGenome,
  ConfigData,
  FitnessData,
  GenomeEntries,
  GenomeEntry,
  GenomeOptions,
  InitConfig,
} from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'

export type { FitnessData }

export interface EvaluationContext {
  evaluateSingle: (entry: GenomeEntry) => Promise<FitnessData>
  evaluateBatch: (entries: Array<GenomeEntry>) => Promise<FitnessData[]>
}

export interface Evaluator<EFO = unknown> {
  environment: Environment<EFO>

  initGenomeFactory: <CD extends ConfigData>(
    configData: CD,
    genomeOptions: GenomeOptions,
    initConfig: InitConfig
  ) => Promise<void>

  evaluate: (genomeEntries: GenomeEntries) => AsyncIterable<FitnessData>

  /** Retrieve the latest telemetry for a genome (from evaluation). */
  getTelemetry?: (genome: AnyGenome) => unknown
}
