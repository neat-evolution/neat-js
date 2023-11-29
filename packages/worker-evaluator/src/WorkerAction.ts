import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  InitConfig,
} from '@neat-evolution/core'

import type { ActionMessage } from './message/ActionMessage.js'
import { createActionMessage } from './message/createActionMessage.js'

export enum ActionType {
  INIT_EVALUATOR = 'INIT_EVALUATOR',
  INIT_EVALUATOR_SUCCESS = 'INIT_EVALUATOR_SUCCESS',
  INIT_GENOME_FACTORY = 'INIT_GENOME_FACTORY',
  INIT_GENOME_FACTORY_SUCCESS = 'INIT_GENOME_FACTORY_SUCCESS',
  REQUEST_EVALUATE_GENOME = 'REQUEST_EVALUATE_GENOME',
  RESPOND_EVALUATE_GENOME = 'RESPOND_EVALUATE_GENOME',
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

export type InitAction = ActionMessage<InitPayload, ActionType.INIT_EVALUATOR>

export type InitSuccessAction = ActionMessage<
  null,
  ActionType.INIT_EVALUATOR_SUCCESS
>

export type TerminateAction = ActionMessage<null, ActionType.TERMINATE>

export interface PayloadMap {
  [ActionType.INIT_EVALUATOR]: InitPayload
  [ActionType.INIT_EVALUATOR_SUCCESS]: null
  [ActionType.INIT_GENOME_FACTORY]: InitGenomeFactoryPayload<any, any>
  [ActionType.INIT_GENOME_FACTORY_SUCCESS]: null
  [ActionType.REQUEST_EVALUATE_GENOME]: GenomeFactoryOptions<any, any>
  [ActionType.RESPOND_EVALUATE_GENOME]: number
  [ActionType.TERMINATE]: null
}

export const createWorkerAction = <T extends ActionType>(
  type: T,
  payload: PayloadMap[T]
): ActionMessage<T, PayloadMap[T]> => createActionMessage(type, payload)
