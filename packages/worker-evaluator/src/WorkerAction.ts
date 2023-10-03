import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  LinkConfig,
  NodeConfig,
} from '@neat-js/core'

export enum ActionType {
  INIT_EVALUATOR = 'INIT_EVALUATOR',
  INIT_EVALUATOR_SUCCESS = 'INIT_EVALUATOR_SUCCESS',
  INIT_GENOME_FACTORY = 'INIT_GENOME_FACTORY',
  INIT_GENOME_FACTORY_SUCCESS = 'INIT_GENOME_FACTORY_SUCCESS',
  REQUEST_EVALUATE_GENOME = 'REQUEST_EVALUATE_GENOME',
  RESPOND_EVALUATE_GENOME = 'RESPOND_EVALUATE_GENOME',
  TERMINATE = 'TERMINATE',
}

export interface Action<P> {
  type: ActionType
  payload: P
}

export interface InitPayload {
  algorithmPathname: string
  createExecutorPathname: string
  createEnvironmentPathname: string
  environmentData: SharedArrayBuffer | null
}

export interface InitGenomeFactoryPayload<
  NC extends NodeConfig,
  LC extends LinkConfig,
  GO extends GenomeOptions
> {
  configData: ConfigData<NC, LC>
  genomeOptions: GO
}

export type InitAction = Action<InitPayload>

export type InitSuccessAction = Action<null>

export type TerminateAction = Action<null>

export interface PayloadMap {
  [ActionType.INIT_EVALUATOR]: InitPayload
  [ActionType.INIT_EVALUATOR_SUCCESS]: null
  [ActionType.INIT_GENOME_FACTORY]: InitGenomeFactoryPayload<any, any, any>
  [ActionType.INIT_GENOME_FACTORY_SUCCESS]: null
  [ActionType.REQUEST_EVALUATE_GENOME]: GenomeFactoryOptions<
    any,
    any,
    any,
    any,
    any,
    any
  >
  [ActionType.RESPOND_EVALUATE_GENOME]: number
  [ActionType.TERMINATE]: null
}

export const createAction = <T extends ActionType>(
  type: T,
  payload: PayloadMap[T]
): Action<PayloadMap[T]> => {
  return {
    type,
    payload,
  }
}
