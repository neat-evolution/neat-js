import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  InitConfig,
  PhenotypeAction,
} from '@neat-evolution/core'
import type { WorkerTrainingCapabilities } from '@neat-evolution/evaluation-strategy'
import {
  createMessage,
  type WorkerMessage,
} from '@neat-evolution/worker-actions'

export enum ActionType {
  INIT_EVALUATOR = 'INIT_EVALUATOR',
  INIT_GENOME_FACTORY = 'INIT_GENOME_FACTORY',
  REQUEST_EVALUATE_GENOME = 'REQUEST_EVALUATE_GENOME',
  REQUEST_EVALUATE_BATCH = 'REQUEST_EVALUATE_BATCH',
  TERMINATE = 'TERMINATE',
}

export interface InitPayload {
  algorithmPathname: string
  createExecutorPathname: string
  createEnvironmentPathname: string
  environmentData: unknown
  executorCacheMaxSize?: number
  /** Module paths for strategy plugins to load on workers. */
  pluginPaths?: string[]
  /** Opaque config blob passed to worker plugins during initialization. */
  pluginData?: Record<string, unknown>
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

export type InitAction = WorkerMessage<
  InitPayload,
  WorkerTrainingCapabilities | undefined
>

export type InitSuccessAction = WorkerMessage<null, null>

export type TerminateAction = WorkerMessage<null, null>

// Action creators for worker-evaluator
export const initEvaluator = createMessage<
  InitPayload,
  WorkerTrainingCapabilities | undefined
>(ActionType.INIT_EVALUATOR)

export const initGenomeFactory = createMessage<InitGenomeFactoryPayload, null>(
  ActionType.INIT_GENOME_FACTORY
)

export const requestEvaluateGenome = createMessage<
  EvaluateGenomePayload,
  EvaluateGenomeResult
>(ActionType.REQUEST_EVALUATE_GENOME)

export const requestEvaluateBatch = createMessage<
  EvaluateBatchPayload,
  number[]
>(ActionType.REQUEST_EVALUATE_BATCH)

export const terminate = createMessage<null, null>(
  ActionType.TERMINATE,
  () => null
)
