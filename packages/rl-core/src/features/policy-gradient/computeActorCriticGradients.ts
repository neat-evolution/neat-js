import type { ActorCriticTransition } from '../actor-critic/types.js'

export interface ActorCriticGradientConfig {
  entropyCoefficient: number
  clipGradients: boolean
  gradientClipValue: number
}

export function computeActorCriticGradients(
  transition: ActorCriticTransition,
  advantage: number,
  config: ActorCriticGradientConfig
): Float64Array {
  const { actionProbabilities, valueEstimate } = transition

  const actionCount = actionProbabilities.length
  const errors = new Float64Array(actionCount + 1)

  for (let i = 0; i < actionCount; i++) {
    const probability = Math.max(actionProbabilities[i] as number, 1e-10)
    const actionValue = transition.action[i] as number
    errors[i] = (-advantage * actionValue) / probability
  }

  if (config.entropyCoefficient !== 0) {
    for (let i = 0; i < actionCount; i++) {
      const probability = Math.max(actionProbabilities[i] as number, 1e-10)
      errors[i] =
        (errors[i] as number) +
        config.entropyCoefficient * (Math.log(probability) + 1)
    }
  }

  errors[actionCount] = valueEstimate - (advantage + valueEstimate)

  if (config.clipGradients) {
    for (let i = 0; i < errors.length; i++) {
      const value = errors[i] as number
      if (value > config.gradientClipValue) {
        errors[i] = config.gradientClipValue
      } else if (value < -config.gradientClipValue) {
        errors[i] = -config.gradientClipValue
      }
    }
  }

  return errors
}
