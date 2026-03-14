import type { Transition } from '@neat-evolution/environment'
import { describe, expect, it } from 'vitest'
import type { ACGradientConfig } from '../src/computeACGradients.js'
import { computeACGradients } from '../src/computeACGradients.js'

function makeTransition(overrides: Partial<Transition> = {}): Transition {
  return {
    state: new Float64Array([1, 0]),
    rawOutput: new Float64Array([0.5, 0.3, 0.1]),
    action: new Float64Array([1, 0]),
    reward: 1,
    done: false,
    actionProbabilities: new Float64Array([0.7, 0.3]),
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

describe('computeACGradients', () => {
  it('returns array of length actionCount + 1', () => {
    const transition = makeTransition()
    const errors = computeACGradients(transition, 0.5, defaultConfig)
    // 2 actions + 1 critic
    expect(errors.length).toBe(3)
  })

  describe('policy gradient direction', () => {
    it('chosen action probability should increase when advantage > 0', () => {
      const transition = makeTransition({
        action: new Float64Array([1, 0]),
        actionProbabilities: new Float64Array([0.5, 0.5]),
      })
      const errors = computeACGradients(transition, 1.0, defaultConfig)
      // For the chosen action (index 0):
      // error = -advantage * action_i / pi_i = -1 * 1 / 0.5 = -2.0
      // Negative error in gradient descent moves the output up -> increases probability
      expect(errors[0]).toBeLessThan(0)
    })

    it('chosen action probability should decrease when advantage < 0', () => {
      const transition = makeTransition({
        action: new Float64Array([1, 0]),
        actionProbabilities: new Float64Array([0.5, 0.5]),
      })
      const errors = computeACGradients(transition, -1.0, defaultConfig)
      // error = -(-1) * 1 / 0.5 = 2.0
      // Positive error moves output down -> decreases probability
      expect(errors[0]).toBeGreaterThan(0)
    })
  })

  describe('critic gradient', () => {
    it('critic error equals negative advantage (V(s) - G_t)', () => {
      const transition = makeTransition({
        actionProbabilities: new Float64Array([0.6, 0.4]),
        criticValue: 0.3,
      })
      const advantage = 0.7 // G_t - V(s) = 1.0 - 0.3
      const errors = computeACGradients(transition, advantage, defaultConfig)
      // Critic error = -advantage = -(G_t - V(s)) = V(s) - G_t
      expect(errors[2]).toBeCloseTo(-0.7)
    })

    it('critic error is 0 when prediction is perfect', () => {
      const transition = makeTransition()
      const errors = computeACGradients(transition, 0, defaultConfig)
      expect(errors[2]).toBeCloseTo(0)
    })
  })

  describe('entropy bonus', () => {
    it('produces non-zero gradient when probabilities are non-uniform', () => {
      const transition = makeTransition({
        actionProbabilities: new Float64Array([0.9, 0.1]),
      })
      const config: ACGradientConfig = {
        ...defaultConfig,
        entropyCoefficient: 0.01,
      }
      const errorsWithEntropy = computeACGradients(transition, 0.5, config)
      const errorsWithout = computeACGradients(transition, 0.5, defaultConfig)

      // Entropy gradient should make the errors different
      const diff0 = Math.abs(
        (errorsWithEntropy[0] as number) - (errorsWithout[0] as number)
      )
      const diff1 = Math.abs(
        (errorsWithEntropy[1] as number) - (errorsWithout[1] as number)
      )
      expect(diff0 + diff1).toBeGreaterThan(0)
    })

    it('produces equal entropy gradient for all actions when probabilities are uniform', () => {
      const transition = makeTransition({
        action: new Float64Array([1, 0]),
        actionProbabilities: new Float64Array([0.5, 0.5]),
      })
      const config: ACGradientConfig = {
        ...defaultConfig,
        entropyCoefficient: 0.01,
      }
      const errorsWithEntropy = computeACGradients(transition, 0.5, config)
      const errorsWithout = computeACGradients(transition, 0.5, defaultConfig)

      // With dL/dp formulas, uniform entropy gradient is log(0.5) + 1 ≈ 0.307 for all actions.
      // This is non-zero in probability space — the backward Jacobian will convert
      // uniform dL/dp to zero dL/dz (the Jacobian subtracts the weighted mean).
      const entropyDiff0 =
        (errorsWithEntropy[0] as number) - (errorsWithout[0] as number)
      const entropyDiff1 =
        (errorsWithEntropy[1] as number) - (errorsWithout[1] as number)
      expect(entropyDiff0).toBeCloseTo(entropyDiff1)
    })
  })

  describe('gradient clipping', () => {
    it('clips magnitudes at gradientClipValue', () => {
      const transition = makeTransition({
        action: new Float64Array([1, 0]),
        actionProbabilities: new Float64Array([0.5, 0.5]),
      })
      const config: ACGradientConfig = {
        ...defaultConfig,
        clipGradients: true,
        gradientClipValue: 0.1,
      }
      // Large advantage to produce large gradients
      const errors = computeACGradients(transition, 10.0, config)
      for (let i = 0; i < errors.length; i++) {
        expect(Math.abs(errors[i] as number)).toBeLessThanOrEqual(0.1 + 1e-10)
      }
    })

    it('does not clip when disabled', () => {
      const transition = makeTransition({
        action: new Float64Array([1, 0]),
        actionProbabilities: new Float64Array([0.5, 0.5]),
      })
      // Large advantage
      const errors = computeACGradients(transition, 10.0, defaultConfig)
      // At least one error should exceed 0.1
      const maxAbs = Math.max(...Array.from(errors).map(Math.abs))
      expect(maxAbs).toBeGreaterThan(0.1)
    })
  })

  it('throws if transition is missing actionProbabilities', () => {
    // Build transition manually to avoid exactOptionalPropertyTypes issue
    const transition: Transition = {
      state: new Float64Array([1, 0]),
      rawOutput: new Float64Array([0.5, 0.3, 0.1]),
      action: new Float64Array([1, 0]),
      reward: 1,
      done: false,
      criticValue: 0.5,
    }
    expect(() => computeACGradients(transition, 0.5, defaultConfig)).toThrow(
      'missing actionProbabilities'
    )
  })

  it('throws if transition is missing criticValue', () => {
    const transition: Transition = {
      state: new Float64Array([1, 0]),
      rawOutput: new Float64Array([0.5, 0.3, 0.1]),
      action: new Float64Array([1, 0]),
      reward: 1,
      done: false,
      actionProbabilities: new Float64Array([0.7, 0.3]),
    }
    expect(() => computeACGradients(transition, 0.5, defaultConfig)).toThrow(
      'missing criticValue'
    )
  })
})
