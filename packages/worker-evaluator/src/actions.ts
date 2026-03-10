import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  InitConfig,
} from '@neat-evolution/core'
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

export interface EvaluateBatchPayload {
  genomeOptions: Array<GenomeFactoryOptions>
  seed?: string | undefined
}

export type InitAction = WorkerMessage<InitPayload>

export type InitSuccessAction = WorkerMessage<null>

export type TerminateAction = WorkerMessage<null>

// Action creators for worker-evaluator
export const initEvaluator = createMessage<InitPayload>(
  ActionType.INIT_EVALUATOR
)

export const initGenomeFactory = createMessage<InitGenomeFactoryPayload>(
  ActionType.INIT_GENOME_FACTORY
)

export const requestEvaluateGenome = createMessage<EvaluateGenomePayload>(
  ActionType.REQUEST_EVALUATE_GENOME
)

export const requestEvaluateBatch = createMessage<EvaluateBatchPayload>(
  ActionType.REQUEST_EVALUATE_BATCH
)

export const terminate = createMessage<null>(ActionType.TERMINATE, () => null)
