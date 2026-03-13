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

  // Policy gradient errors for actor outputs
  // For softmax policy: d(log(pi_a))/d(output_i) = (1{i=a} - pi_i)
  // error_i = -advantage * (action_i - pi_i)
  for (let i = 0; i < actionCount; i++) {
    const prob = actionProbs[i] as number
    const actionVal = transition.action[i] as number
    errors[i] = -advantage * (actionVal - prob)
  }

  // Entropy bonus: encourages exploration by penalizing confident distributions
  if (config.entropyCoefficient !== 0) {
    // Compute weighted mean of (log(pi) + 1) for softmax entropy gradient
    let meanEntropyGrad = 0
    for (let i = 0; i < actionCount; i++) {
      const prob = actionProbs[i] as number
      const clampedProb = Math.max(prob, 1e-10)
      meanEntropyGrad += prob * (Math.log(clampedProb) + 1)
    }

    for (let i = 0; i < actionCount; i++) {
      const prob = actionProbs[i] as number
      const clampedProb = Math.max(prob, 1e-10)
      // Entropy gradient w.r.t. softmax logit i:
      // d(-H)/d(z_i) = pi_i * ((log(pi_i) + 1) - sum_j(pi_j * (log(pi_j) + 1)))
      // We add +c * this to encourage entropy (exploration)
      const entropyGrad = prob * (Math.log(clampedProb) + 1 - meanEntropyGrad)
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
