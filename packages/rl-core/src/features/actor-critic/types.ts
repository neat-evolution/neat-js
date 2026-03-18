import type {
  BaseOpenStep,
  BaseStepTransition,
} from '../../core/StepTypes.js'

export interface ActorCriticOpenStep<Info = unknown>
  extends BaseOpenStep<Info> {
  actionProbabilities: Float64Array
  valueEstimate: number
  actionLogProbability: number
}

export interface ActorCriticTransition<Info = unknown>
  extends BaseStepTransition<Info> {
  actionProbabilities: Float64Array
  valueEstimate: number
  nextValueEstimate: number
  actionLogProbability: number
}
