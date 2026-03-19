import type { BaseStepTransition } from '../../core/StepTypes.js'
import { bootstrapMask } from '../td/computeDiscountedReturns.js'

export interface ValueTransition extends BaseStepTransition {
  valueEstimate: number
  nextValueEstimate: number
}

export interface GeneralizedAdvantageConfig<
  TTransition extends ValueTransition = ValueTransition,
> {
  discountFactor: number
  lambda: number
  getValueEstimate?: (transition: TTransition) => number
  getNextValueEstimate?: (transition: TTransition) => number
}

export function computeAdvantages<
  TTransition extends ValueTransition = ValueTransition,
>(
  returns: Float64Array,
  transitions: readonly TTransition[],
  getValueEstimate: (transition: TTransition) => number = (transition) =>
    transition.valueEstimate
): Float64Array {
  const advantages = new Float64Array(returns.length)
  for (let i = 0; i < returns.length; i++) {
    const transition = transitions[i]
    if (transition === undefined) {
      throw new Error(`Missing transition at index ${i}`)
    }
    advantages[i] = (returns[i] as number) - getValueEstimate(transition)
  }
  return advantages
}

export function computeGeneralizedAdvantages<
  TTransition extends ValueTransition = ValueTransition,
>(
  transitions: readonly TTransition[],
  config: GeneralizedAdvantageConfig<TTransition>
): Float64Array {
  const advantages = new Float64Array(transitions.length)
  let gae = 0

  for (let i = transitions.length - 1; i >= 0; i--) {
    const transition = transitions[i]
    if (transition === undefined) {
      throw new Error(`Missing transition at index ${i}`)
    }
    const valueEstimate =
      config.getValueEstimate?.(transition) ?? transition.valueEstimate
    const nextValueEstimate =
      config.getNextValueEstimate?.(transition) ?? transition.nextValueEstimate
    const delta =
      transition.reward +
      config.discountFactor * bootstrapMask(transition) * nextValueEstimate -
      valueEstimate
    gae =
      delta +
      config.discountFactor * config.lambda * bootstrapMask(transition) * gae
    advantages[i] = gae
  }

  return advantages
}

export function normalizeValues(values: Float64Array): Float64Array {
  if (values.length <= 1) {
    return Float64Array.from(values)
  }

  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i] as number
  }
  const mean = sum / values.length

  let variance = 0
  for (let i = 0; i < values.length; i++) {
    const centered = (values[i] as number) - mean
    variance += centered * centered
  }
  variance /= values.length
  const std = Math.sqrt(variance)
  if (std === 0) {
    return Float64Array.from(values)
  }

  const normalized = new Float64Array(values.length)
  for (let i = 0; i < values.length; i++) {
    normalized[i] = ((values[i] as number) - mean) / std
  }
  return normalized
}
