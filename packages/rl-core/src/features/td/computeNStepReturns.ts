import type { BaseStepTransition } from '../../core/StepTypes.js'
import { bootstrapMask } from './computeDiscountedReturns.js'

export interface NStepReturnConfig<
  TTransition extends BaseStepTransition = BaseStepTransition,
> {
  discountFactor: number
  horizon: number
  getBootstrapValue: (transition: TTransition) => number
}

export function computeNStepReturns<
  TTransition extends BaseStepTransition = BaseStepTransition,
>(
  transitions: readonly TTransition[],
  config: NStepReturnConfig<TTransition>
): Float64Array {
  const returns = new Float64Array(transitions.length)

  for (let start = 0; start < transitions.length; start++) {
    let discountedReturn = 0
    let discount = 1
    let lastIncludedIndex = start - 1

    for (
      let offset = 0;
      offset < config.horizon && start + offset < transitions.length;
      offset++
    ) {
      const transition = transitions[start + offset]
      if (transition === undefined) {
        throw new Error(`Missing transition at index ${start + offset}`)
      }
      discountedReturn += discount * transition.reward
      discount *= config.discountFactor
      lastIncludedIndex = start + offset

      if (transition.terminated || transition.truncated) {
        break
      }
    }

    if (lastIncludedIndex < start) {
      continue
    }

    const lastTransition = transitions[lastIncludedIndex]
    if (lastTransition === undefined) {
      throw new Error(`Missing transition at index ${lastIncludedIndex}`)
    }

    if (
      !lastTransition.terminated &&
      !lastTransition.truncated &&
      lastIncludedIndex === start + config.horizon - 1
    ) {
      discountedReturn +=
        discount *
        bootstrapMask(lastTransition) *
        config.getBootstrapValue(lastTransition)
    }

    returns[start] = discountedReturn
  }

  return returns
}
