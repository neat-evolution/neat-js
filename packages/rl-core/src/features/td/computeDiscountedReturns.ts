import type { BaseStepTransition } from '../../core/StepTypes.js'

export interface DiscountedReturnConfig<
  TTransition extends BaseStepTransition = BaseStepTransition,
> {
  discountFactor: number
  getBootstrapValue: (lastTransition: TTransition) => number
}

export function bootstrapMask(
  transition: Pick<BaseStepTransition, 'terminated'>
): 0 | 1 {
  return transition.terminated ? 0 : 1
}

export function maskBootstrapValue(
  transition: Pick<BaseStepTransition, 'terminated'>,
  value: number
): number {
  return bootstrapMask(transition) * value
}

export function maxQBootstrap(nextQValues: Float64Array): number {
  let best = -Infinity
  for (let i = 0; i < nextQValues.length; i++) {
    const value = nextQValues[i] as number
    if (value > best) {
      best = value
    }
  }
  return nextQValues.length === 0 ? 0 : best
}

export function computeDiscountedReturns<
  TTransition extends BaseStepTransition = BaseStepTransition,
>(
  transitions: readonly TTransition[],
  config: DiscountedReturnConfig<TTransition>
): Float64Array {
  if (transitions.length === 0) {
    return new Float64Array(0)
  }

  const returns = new Float64Array(transitions.length)
  const lastTransition = transitions[transitions.length - 1] as TTransition
  let G = maskBootstrapValue(
    lastTransition,
    config.getBootstrapValue(lastTransition)
  )

  for (let i = transitions.length - 1; i >= 0; i--) {
    const transition = transitions[i]
    if (transition === undefined) {
      throw new Error(`Missing transition at index ${i}`)
    }
    G = transition.reward + config.discountFactor * G
    returns[i] = G
  }

  return returns
}
