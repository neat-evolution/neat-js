import type { Transition } from '@neat-evolution/execution-manager'

/** Configuration for Q-learning gradient computation. */
export interface QLGradientConfig {
  /** Discount factor (gamma). */
  discountFactor: number
  /** Learning rate for backward pass. */
  learningRate: number
}

/**
 * Compute Q-learning output errors for backward pass (standard mode).
 *
 * The error is nonzero only at the chosen action's output index.
 *
 *   error[i] = tdError  if i === chosenActionIndex
 *   error[i] = 0        otherwise
 *
 * This is the derivative of the standard DQN loss:
 *   loss = (Q(s, a) - G_t)^2
 *   d(loss)/d(Q) = 2 * (Q(s, a) - G_t)
 * Applied only to the action that was taken (sparse error).
 *
 * @param transition - The transition with qValues and chosenActionIndex
 * @param tdError - Precomputed TD error: Q(s, a) - G_t
 * @param outputCount - Total number of network outputs
 * @returns errors array for backward pass
 */
export function computeQLOutputErrors(
  transition: Transition,
  tdError: number,
  outputCount: number
): Float64Array {
  const chosenActionIndex = transition.chosenActionIndex
  if (chosenActionIndex === undefined) {
    throw new Error(
      'Transition missing chosenActionIndex for QL gradient computation'
    )
  }

  const errors = new Float64Array(outputCount)
  errors[chosenActionIndex] = tdError
  return errors
}

/**
 * Compute Q-learning output errors for backward pass (multi-discrete mode).
 *
 * Each binary factor pair is an independent 2-action DQN. The error for each
 * pair is placed at the chosen output index within that pair.
 *
 * For factor f with action[f] = 1 (on), chosen output index = 2*f + 0 (Q_on).
 * For factor f with action[f] = 0 (off), chosen output index = 2*f + 1 (Q_off).
 *
 * @param transition - The transition with qValues and action
 * @param tdErrors - Per-factor TD errors (length = factorCount)
 * @param factorCount - Number of binary factors (network has 2*factorCount outputs)
 * @returns errors array for backward pass (length = 2*factorCount)
 */
export function computeQLMultiDiscreteOutputErrors(
  transition: Transition,
  tdErrors: Float64Array,
  factorCount: number
): Float64Array {
  const errors = new Float64Array(2 * factorCount)

  for (let b = 0; b < factorCount; b++) {
    const actionVal = transition.action[b] as number
    // action = 1 means "on" (chose index 0 in pair), action = 0 means "off" (chose index 1)
    const chosenIdx = actionVal === 1 ? 0 : 1
    errors[2 * b + chosenIdx] = tdErrors[b] as number
  }

  return errors
}
