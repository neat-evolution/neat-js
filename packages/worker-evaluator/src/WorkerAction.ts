import type { FitnessData } from '@neat-js/evaluator'
import type { SerializedPhenotypeData } from '@neat-js/phenotype'

export enum ActionType {
  EVALUATE = 'EVALUATE',
  EVALUATION_RESULT = 'EVALUATION_RESULT',
  INIT = 'INIT',
  INIT_SUCCESS = 'INIT_SUCCESS',
  TERMINATE = 'TERMINATE',
}

export interface Action<P> {
  type: ActionType
  payload: P
}

export type EvaluatePayload = SerializedPhenotypeData
export type EvaluateAction = Action<EvaluatePayload>

export type EvaluationResultPayload = FitnessData
export type EvaluationResultAction = Action<EvaluationResultPayload>

export interface InitPayload {
  createExecutorPathname: string
  createEnvironmentPathname: string
  environmentData: SharedArrayBuffer | null
}
export type InitAction = Action<InitPayload>

export type InitSuccessAction = Action<null>

export type TerminateAction = Action<null>

export interface PayloadMap {
  [ActionType.INIT]: InitPayload
  [ActionType.INIT_SUCCESS]: null
  [ActionType.EVALUATE]: EvaluatePayload
  [ActionType.EVALUATION_RESULT]: EvaluationResultPayload
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
