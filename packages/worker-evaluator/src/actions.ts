import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  InitConfig,
  PhenotypeAction,
} from '@neat-evolution/core'
import type { StatsRecorderConfig } from '@neat-evolution/stats'
import {
  createMessage,
  type WorkerMessage,
} from '@neat-evolution/worker-actions'

export enum ActionType {
  INIT_EVALUATOR = 'INIT_EVALUATOR',
  INIT_GENOME_FACTORY = 'INIT_GENOME_FACTORY',
  REQUEST_EVALUATE_GENOME = 'REQUEST_EVALUATE_GENOME',
  REQUEST_EVALUATE_BATCH = 'REQUEST_EVALUATE_BATCH',
  RECORD_STATS = 'RECORD_STATS',
  TERMINATE = 'TERMINATE',
}

export interface InitPayload {
  algorithmPathname: string
  createExecutorPathname: string
  createEnvironmentPathname: string
  environmentData: unknown
  executorCacheMaxSize?: number
  /** Serialized stats recorder config from the main-thread recorder's `toJSON()`.
   *  When provided, workers create a WorkerStatsRecorder that sends
   *  records back to the main thread via fire-and-forget messages. */
  statsConfig?: StatsRecorderConfig
  /** Map of field names to module pathnames for worker-side hydration. */
  hydrateEnvironmentOptions?: Record<string, string>
  /** Serializable runtime data merged into EnvironmentRuntimeOptions on workers.
   *  Use for factory options and config blobs (functions go via hydrateEnvironmentOptions). */
  environmentRuntimeData?: Record<string, unknown>
}

export interface InitGenomeFactoryPayload<
  CD extends ConfigData = ConfigData,
  GO extends GenomeOptions = GenomeOptions,
> {
  configData: CD
  genomeOptions: GO
  initConfig: InitConfig
}

export interface EvaluateGenomePayload {
  genomeOptions: GenomeFactoryOptions
  seed?: string | undefined
}

/** Enriched result from worker genome evaluation.
 *  Vanilla evaluation returns only `fitness`. When training plugins are active,
 *  the worker may also return writeback data and telemetry. */
export interface EvaluateGenomeResult {
  fitness: number
  /** Updated network weights for Lamarckian writeback. */
  updatedActions?: PhenotypeAction[]
  /** Plugin-specific telemetry from the evaluation. */
  telemetry?: unknown
}

export interface EvaluateBatchPayload {
  genomeOptions: Array<GenomeFactoryOptions>
  seed?: string | undefined
}

export interface EvaluateBatchResult {
  fitnessScores: number[]
  writebacks?: Map<number, PhenotypeAction[]>
}

export type InitAction = WorkerMessage<InitPayload, undefined>

export type InitSuccessAction = WorkerMessage<null, null>

export type TerminateAction = WorkerMessage<null, null>

// Action creators for worker-evaluator
export const initEvaluator = createMessage<InitPayload, undefined>(
  ActionType.INIT_EVALUATOR
)

export const initGenomeFactory = createMessage<InitGenomeFactoryPayload, null>(
  ActionType.INIT_GENOME_FACTORY
)

export const requestEvaluateGenome = createMessage<
  EvaluateGenomePayload,
  EvaluateGenomeResult
>(ActionType.REQUEST_EVALUATE_GENOME)

export const requestEvaluateBatch = createMessage<
  EvaluateBatchPayload,
  EvaluateBatchResult
>(ActionType.REQUEST_EVALUATE_BATCH)

export interface RecordStatsPayload {
  metric: string
  value: unknown
}

export const recordStats = createMessage<RecordStatsPayload, void>(
  ActionType.RECORD_STATS
)

export const terminate = createMessage<null, null>(
  ActionType.TERMINATE,
  () => null
)
