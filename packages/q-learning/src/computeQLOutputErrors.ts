import type { Transition } from '@neat-evolution/environment'

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
 * Each button pair is an independent 2-action DQN. The error for each pair
 * is placed at the chosen output index within that pair.
 *
 * For button b with action[b] = 1 (on), chosen output index = 2*b + 0 (Q_on).
 * For button b with action[b] = 0 (off), chosen output index = 2*b + 1 (Q_off).
 *
 * @param transition - The transition with qValues and action
 * @param tdErrors - Per-button TD errors (length = buttonCount)
 * @param buttonCount - Number of buttons (network has 2*buttonCount outputs)
 * @returns errors array for backward pass (length = 2*buttonCount)
 */
export function computeQLOutputErrorsPerButton(
  transition: Transition,
  tdErrors: Float64Array,
  buttonCount: number
): Float64Array {
  const errors = new Float64Array(2 * buttonCount)

  for (let b = 0; b < buttonCount; b++) {
    const actionVal = transition.action[b] as number
    // action = 1 means "on" (chose index 0 in pair), action = 0 means "off" (chose index 1)
    const chosenIdx = actionVal === 1 ? 0 : 1
    errors[2 * b + chosenIdx] = tdErrors[b] as number
  }

  return errors
}
