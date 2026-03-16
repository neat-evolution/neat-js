import type { Transition } from '@neat-evolution/execution-manager'
import type { ACGradientConfig } from '../../computeACGradients.js'

/**
 * Compute Actor-Critic output errors for multi-discrete mode.
 *
 * Each binary factor has a 2-way softmax pair [P_on, P_off]. The policy
 * gradient is applied per-factor at the chosen index within each pair.
 * Entropy bonus is applied to both elements of each pair. The critic
 * error is at the last index (2N).
 *
 * @param transition - The transition with actionProbabilities (length 2N) and action (length N)
 * @param advantage - Precomputed advantage: G_t - V(s)
 * @param config - Gradient configuration
 * @param factorCount - Number of binary factors (N)
 * @returns errors array for backward pass (length = 2N + 1)
 */
export function computeACMultiDiscreteGradients(
  transition: Transition,
  advantage: number,
  config: ACGradientConfig,
  factorCount: number
): Float64Array {
  const actionProbabilities = transition.actionProbabilities
  if (actionProbabilities === undefined) {
    throw new Error(
      'Transition missing actionProbabilities for AC multi-discrete gradient computation'
    )
  }
  const criticValue = transition.criticValue
  if (criticValue === undefined) {
    throw new Error(
      'Transition missing criticValue for AC multi-discrete gradient computation'
    )
  }

  const errors = new Float64Array(2 * factorCount + 1)

  for (let b = 0; b < factorCount; b++) {
    const pOn = Math.max(actionProbabilities[2 * b] as number, 1e-10)
    const pOff = Math.max(actionProbabilities[2 * b + 1] as number, 1e-10)
    const actionVal = transition.action[b] as number

    // chosenIdx: 0 if on (action=1), 1 if off (action=0)
    const chosenIdx = actionVal === 1 ? 0 : 1
    const chosenProb = actionVal === 1 ? pOn : pOff

    // Policy gradient: only at chosen index within pair
    errors[2 * b + chosenIdx] = -advantage / chosenProb

    // Entropy bonus: applied to both elements of the pair
    if (config.entropyCoefficient !== 0) {
      const c = config.entropyCoefficient
      errors[2 * b] = (errors[2 * b] as number) + c * (Math.log(pOn) + 1)
      errors[2 * b + 1] =
        (errors[2 * b + 1] as number) + c * (Math.log(pOff) + 1)
    }
  }

  // Critic error at index 2N
  errors[2 * factorCount] = -advantage

  // Gradient clipping
  if (config.clipGradients) {
    const clipValue = config.gradientClipValue
    for (let i = 0; i < errors.length; i++) {
      const val = errors[i] as number
      if (val > clipValue) {
        errors[i] = clipValue
      } else if (val < -clipValue) {
        errors[i] = -clipValue
      }
    }
  }

  return errors
}
