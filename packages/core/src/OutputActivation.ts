import type { Activation } from './Activation.js'

/** A group of consecutive outputs sharing an activation function. */
export type OutputActivationGroup = readonly [
  count: number,
  activation: Activation,
]

/**
 * Output activation specification.
 * - Single Activation: all outputs share the same activation (backward compat)
 * - Array of groups: consecutive output groups with different activations
 *   e.g., [[3, Activation.Softmax], [1, Activation.Linear]]
 */
export type OutputActivationSpec = Activation | readonly OutputActivationGroup[]

/** Resolve the activation for a specific output index. */
export function resolveOutputActivation(
  spec: OutputActivationSpec,
  outputIndex: number
): Activation {
  if (typeof spec === 'string') {
    return spec
  }
  let offset = 0
  for (const [count, activation] of spec) {
    if (outputIndex < offset + count) {
      return activation
    }
    offset += count
  }
  // Fallback: use the last group's activation
  const lastGroup = spec[spec.length - 1]
  if (lastGroup === undefined) {
    throw new Error('OutputActivationSpec array must not be empty')
  }
  return lastGroup[1]
}
