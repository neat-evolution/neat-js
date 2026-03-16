import type { Transition } from '@neat-evolution/execution-manager'
import { describe, expect, it } from 'vitest'
import type { ACGradientConfig } from '../src/computeACGradients.js'
import { computeACMultiDiscreteGradients } from '../src/features/multi-discrete/computeACMultiDiscreteGradients.js'

function makeTransition(overrides: Partial<Transition> = {}): Transition {
  // 2 factors: 4 actor probs + 1 critic = 5 outputs
  return {
    state: new Float64Array([1, 0]),
    rawOutput: new Float64Array([0.7, 0.3, 0.6, 0.4, 0.5]),
    action: new Float64Array([1, 0]), // factor 0 = on, factor 1 = off
    reward: 1,
    terminated: false,
    truncated: false,
    actionProbabilities: new Float64Array([0.7, 0.3, 0.6, 0.4]),
    criticValue: 0.5,
    ...overrides,
  }
}

const defaultConfig: ACGradientConfig = {
  discountFactor: 0.99,
  entropyCoefficient: 0,
  clipGradients: false,
  gradientClipValue: 1,
}

describe('computeACMultiDiscreteGradients', () => {
  const factorCount = 2

  it('returns 2N+1 length errors', () => {
    const transition = makeTransition()
    const errors = computeACMultiDiscreteGradients(
      transition,
      0.5,
      defaultConfig,
      factorCount
    )
    // 2*2 + 1 = 5
    expect(errors.length).toBe(5)
  })

  it('policy gradient at correct pair index for action=1 (on)', () => {
    const transition = makeTransition({
      action: new Float64Array([1, 0]),
      actionProbabilities: new Float64Array([0.8, 0.2, 0.6, 0.4]),
    })
    const advantage = 1.0
    const errors = computeACMultiDiscreteGradients(
      transition,
      advantage,
      defaultConfig,
      factorCount
    )
    // Factor 0: action=1, chosenIdx=0, error at index 0 = -1.0/0.8 = -1.25
    expect(errors[0]).toBeCloseTo(-1.25)
    // Factor 0: unchosen index 1 should be 0
    expect(errors[1]).toBeCloseTo(0)
  })

  it('policy gradient at correct pair index for action=0 (off)', () => {
    const transition = makeTransition({
      action: new Float64Array([1, 0]),
      actionProbabilities: new Float64Array([0.8, 0.2, 0.6, 0.4]),
    })
    const advantage = 1.0
    const errors = computeACMultiDiscreteGradients(
      transition,
      advantage,
      defaultConfig,
      factorCount
    )
    // Factor 1: action=0, chosenIdx=1, error at index 3 = -1.0/0.4 = -2.5
    expect(errors[3]).toBeCloseTo(-2.5)
    // Factor 1: unchosen index 2 should be 0
    expect(errors[2]).toBeCloseTo(0)
  })

  it('per-factor entropy applied to both elements of each pair', () => {
    const transition = makeTransition({
      action: new Float64Array([1, 0]),
      actionProbabilities: new Float64Array([0.8, 0.2, 0.6, 0.4]),
    })
    const config: ACGradientConfig = {
      ...defaultConfig,
      entropyCoefficient: 0.01,
    }
    const errorsWithEntropy = computeACMultiDiscreteGradients(
      transition,
      0.5,
      config,
      factorCount
    )
    const errorsWithout = computeACMultiDiscreteGradients(
      transition,
      0.5,
      defaultConfig,
      factorCount
    )

    // Both elements of each pair should differ from no-entropy version
    for (let b = 0; b < factorCount; b++) {
      const diff0 = Math.abs(
        (errorsWithEntropy[2 * b] as number) - (errorsWithout[2 * b] as number)
      )
      const diff1 = Math.abs(
        (errorsWithEntropy[2 * b + 1] as number) -
          (errorsWithout[2 * b + 1] as number)
      )
      expect(diff0).toBeGreaterThan(0)
      expect(diff1).toBeGreaterThan(0)
    }
  })

  it('critic error at index 2N', () => {
    const transition = makeTransition()
    const advantage = 0.7
    const errors = computeACMultiDiscreteGradients(
      transition,
      advantage,
      defaultConfig,
      factorCount
    )
    // Critic at index 2*2 = 4
    expect(errors[4]).toBeCloseTo(-0.7)
  })

  it('gradient clipping applies to all elements', () => {
    const transition = makeTransition({
      action: new Float64Array([1, 0]),
      actionProbabilities: new Float64Array([0.01, 0.99, 0.01, 0.99]),
    })
    const config: ACGradientConfig = {
      ...defaultConfig,
      clipGradients: true,
      gradientClipValue: 0.5,
    }
    const errors = computeACMultiDiscreteGradients(
      transition,
      10.0,
      config,
      factorCount
    )
    for (let i = 0; i < errors.length; i++) {
      expect(Math.abs(errors[i] as number)).toBeLessThanOrEqual(0.5 + 1e-10)
    }
  })

  it('throws if transition is missing actionProbabilities', () => {
    const transition: Transition = {
      state: new Float64Array([1, 0]),
      rawOutput: new Float64Array([0.7, 0.3, 0.6, 0.4, 0.5]),
      action: new Float64Array([1, 0]),
      reward: 1,
      terminated: false,
      truncated: false,
      criticValue: 0.5,
    }
    expect(() =>
      computeACMultiDiscreteGradients(
        transition,
        0.5,
        defaultConfig,
        factorCount
      )
    ).toThrow('missing actionProbabilities')
  })

  it('throws if transition is missing criticValue', () => {
    const transition: Transition = {
      state: new Float64Array([1, 0]),
      rawOutput: new Float64Array([0.7, 0.3, 0.6, 0.4, 0.5]),
      action: new Float64Array([1, 0]),
      reward: 1,
      terminated: false,
      truncated: false,
      actionProbabilities: new Float64Array([0.7, 0.3, 0.6, 0.4]),
    }
    expect(() =>
      computeACMultiDiscreteGradients(
        transition,
        0.5,
        defaultConfig,
        factorCount
      )
    ).toThrow('missing criticValue')
  })
})
