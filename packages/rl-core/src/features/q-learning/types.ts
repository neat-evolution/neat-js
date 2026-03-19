import type { BaseOpenStep, BaseStepTransition } from '../../core/StepTypes.js'

export interface QLearningOpenStep<Info = unknown> extends BaseOpenStep<Info> {
  qValues: Float64Array
  chosenActionIndex: number
}

export interface QLearningTransition<Info = unknown>
  extends BaseStepTransition<Info> {
  qValues: Float64Array
  nextQValues: Float64Array
  chosenActionIndex: number
}
