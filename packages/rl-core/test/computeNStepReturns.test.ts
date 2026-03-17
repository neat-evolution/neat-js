import { describe, expect, it } from 'vitest'
import {
  computeDiscountedReturns,
  maxQBootstrap,
} from '../src/features/td/computeDiscountedReturns.js'

describe('computeDiscountedReturns', () => {
  it('bootstraps from nextValueEstimate when the last transition is not terminal', () => {
    const returns = computeDiscountedReturns(
      [
        {
          state: new Float64Array([1, 0]),
          rawOutput: new Float64Array([0.8, 0.2, 0.25]),
          action: new Float64Array([1, 0]),
          reward: 1,
          nextState: new Float64Array([0, 1]),
          terminated: false,
          truncated: false,
          nextValueEstimate: 0.5,
        },
        {
          state: new Float64Array([0, 1]),
          rawOutput: new Float64Array([0.4, 0.6, 0.5]),
          action: new Float64Array([0, 1]),
          reward: 2,
          nextState: new Float64Array([0, 1]),
          terminated: false,
          truncated: true,
          nextValueEstimate: 3,
        },
      ],
      {
        discountFactor: 0.5,
        getBootstrapValue: (transition) => transition.nextValueEstimate,
      }
    )

    expect(Array.from(returns)).toEqual([2.75, 3.5])
  })

  it('zeros the bootstrap value when the last transition is terminal', () => {
    const returns = computeDiscountedReturns(
      [
        {
          state: new Float64Array([1]),
          rawOutput: new Float64Array([1, 0.25]),
          action: new Float64Array([1]),
          reward: 2,
          nextState: new Float64Array([0]),
          terminated: true,
          truncated: false,
          nextValueEstimate: 99,
        },
      ],
      {
        discountFactor: 0.9,
        getBootstrapValue: (transition) => transition.nextValueEstimate,
      }
    )

    expect(Array.from(returns)).toEqual([2])
  })

  it('supports max-Q bootstrap helpers for Q-learning transitions', () => {
    const returns = computeDiscountedReturns(
      [
        {
          state: new Float64Array([1]),
          rawOutput: new Float64Array([0.2, 0.8, 0.1]),
          action: new Float64Array([0, 1, 0]),
          reward: 1,
          nextState: new Float64Array([0]),
          terminated: false,
          truncated: true,
          nextQValues: new Float64Array([0.4, 0.6, 0.1]),
        },
      ],
      {
        discountFactor: 0.5,
        getBootstrapValue: (transition) => maxQBootstrap(transition.nextQValues),
      }
    )

    expect(Array.from(returns)).toEqual([1.3])
  })
})
