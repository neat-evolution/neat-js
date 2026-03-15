import type { Transition } from '@neat-evolution/environment'

/** Configuration for Actor-Critic gradient computation. */
export interface ACGradientConfig {
  /** Discount factor (gamma). */
  discountFactor: number
  /** Entropy coefficient for exploration bonus. */
  entropyCoefficient: number
  /** Whether to clip gradients. */
  clipGradients: boolean
  /** Max gradient magnitude. */
  gradientClipValue: number
}

/**
 * Compute Actor-Critic output errors for backward pass.
 *
 * Given a transition and its precomputed advantage, compute the error
 * signal for each output node.
 *
 * Actor error:  -advantage * d(log(pi(a|s)))/d(theta)  (policy gradient)
 * Critic error: (V(s) - G_t)                            (value function MSE)
 * Entropy bonus: -c * sum(pi * log(pi))                  (exploration encouragement)
 *
 * The advantage and return G_t are precomputed by trainOnSegment()
 * using n-step returns across the full rollout segment.
 *
 * @param transition - The transition with actionProbabilities and criticValue
 * @param advantage - Precomputed advantage: G_t - V(s)
 * @param config - Gradient configuration
 * @returns errors array for backward pass (length = actionCount + 1)
 */
export function computeACGradients(
  transition: Transition,
  advantage: number,
  config: ACGradientConfig
): Float64Array {
  const actionProbs = transition.actionProbabilities
  if (actionProbs === undefined) {
    throw new Error(
      'Transition missing actionProbabilities for AC gradient computation'
    )
  }
  const criticValue = transition.criticValue
  if (criticValue === undefined) {
    throw new Error(
      'Transition missing criticValue for AC gradient computation'
    )
  }

  const actionCount = actionProbs.length
  const errors = new Float64Array(actionCount + 1)

  // Policy gradient errors for actor outputs (dL/d_probability)
  // Loss = -advantage * log(p_a), so dL/dp_i = -advantage * action_i / p_i
  // Only the selected action (action_i = 1) has a non-zero gradient
  for (let i = 0; i < actionCount; i++) {
    const prob = actionProbs[i] as number
    const actionVal = transition.action[i] as number
    const clampedProb = Math.max(prob, 1e-10)
    errors[i] = (-advantage * actionVal) / clampedProb
  }

  // Entropy bonus: encourages exploration by penalizing confident distributions
  // Entropy = -sum(p_i * log(p_i)), we minimize -H so dL/dp_i = log(p_i) + 1
  // The backward Jacobian in createTrainableExecutor converts dL/dp → dL/dz
  if (config.entropyCoefficient !== 0) {
    for (let i = 0; i < actionCount; i++) {
      const prob = actionProbs[i] as number
      const clampedProb = Math.max(prob, 1e-10)
      const entropyGrad = Math.log(clampedProb) + 1
      errors[i] =
        (errors[i] as number) + config.entropyCoefficient * entropyGrad
    }
  }

  // Critic error: MSE gradient = (V(s) - G_t) = -advantage
  errors[actionCount] = -advantage

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
