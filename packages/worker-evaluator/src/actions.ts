import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  InitConfig,
} from '@neat-evolution/core'
import { createAction, type WorkerAction } from '@neat-evolution/worker-actions'

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
  environmentData: any
}

export interface InitGenomeFactoryPayload<
  CD extends ConfigData,
  GO extends GenomeOptions,
> {
  configData: CD
  genomeOptions: GO
  initConfig: InitConfig
}

export interface EvaluateGenomePayload {
  genomeOptions: GenomeFactoryOptions<any, any>
  seed?: string | undefined
}

export interface EvaluateBatchPayload {
  genomeOptions: Array<GenomeFactoryOptions<any, any>>
  seed?: string | undefined
}

export type InitAction = WorkerAction<InitPayload>

export type InitSuccessAction = WorkerAction<null>

export type TerminateAction = WorkerAction<null>

// Action creators for worker-evaluator
export const initEvaluator = createAction<InitPayload>(
  ActionType.INIT_EVALUATOR
)

export const initGenomeFactory = createAction<
  InitGenomeFactoryPayload<any, any>
>(ActionType.INIT_GENOME_FACTORY)

export const requestEvaluateGenome = createAction<EvaluateGenomePayload>(
  ActionType.REQUEST_EVALUATE_GENOME
)

export const requestEvaluateBatch = createAction<EvaluateBatchPayload>(
  ActionType.REQUEST_EVALUATE_BATCH
)

export const terminate = createAction<null>(ActionType.TERMINATE, () => null)
