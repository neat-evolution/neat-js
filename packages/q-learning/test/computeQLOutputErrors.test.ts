import type { Transition } from '@neat-evolution/environment'
import { describe, expect, it } from 'vitest'
import {
  computeQLOutputErrors,
  computeQLOutputErrorsPerButton,
} from '../src/computeQLOutputErrors.js'

function makeTransition(overrides: Partial<Transition> = {}): Transition {
  return {
    state: new Float64Array([1, 0]),
    rawOutput: new Float64Array([0.5, 0.3, 0.1]),
    action: new Float64Array([1, 0, 0]),
    qValues: new Float64Array([0.5, 0.3, 0.1]),
    chosenActionIndex: 0,
    reward: 1,
    done: false,
    ...overrides,
  }
}

describe('computeQLOutputErrors', () => {
  it('returns array of correct length', () => {
    const transition = makeTransition()
    const errors = computeQLOutputErrors(transition, 0.5, 3)
    expect(errors.length).toBe(3)
  })

  it('only chosen action index gets error signal', () => {
    const transition = makeTransition({ chosenActionIndex: 1 })
    const tdError = 0.3
    const errors = computeQLOutputErrors(transition, tdError, 3)

    expect(errors[0]).toBe(0)
    expect(errors[1]).toBe(0.3)
    expect(errors[2]).toBe(0)
  })

  it('positive error when Q overestimates (Q > G_t)', () => {
    const transition = makeTransition({ chosenActionIndex: 0 })
    // Q(s,a) = 0.5, G_t = 0.3 => tdError = 0.5 - 0.3 = 0.2
    const errors = computeQLOutputErrors(transition, 0.2, 3)
    expect(errors[0]).toBeGreaterThan(0)
  })

  it('negative error when Q underestimates (Q < G_t)', () => {
    const transition = makeTransition({ chosenActionIndex: 0 })
    // Q(s,a) = 0.5, G_t = 0.8 => tdError = 0.5 - 0.8 = -0.3
    const errors = computeQLOutputErrors(transition, -0.3, 3)
    expect(errors[0]).toBeLessThan(0)
  })

  it('zero error when prediction is perfect', () => {
    const transition = makeTransition({ chosenActionIndex: 0 })
    const errors = computeQLOutputErrors(transition, 0, 3)
    for (let i = 0; i < errors.length; i++) {
      expect(errors[i]).toBe(0)
    }
  })

  it('throws if transition is missing chosenActionIndex', () => {
    const transition: Transition = {
      state: new Float64Array([1, 0]),
      rawOutput: new Float64Array([0.5, 0.3, 0.1]),
      action: new Float64Array([1, 0, 0]),
      qValues: new Float64Array([0.5, 0.3, 0.1]),
      reward: 1,
      done: false,
    }
    expect(() => computeQLOutputErrors(transition, 0.5, 3)).toThrow(
      'missing chosenActionIndex'
    )
  })
})

describe('computeQLOutputErrorsPerButton', () => {
  it('returns array of length 2 * buttonCount', () => {
    const transition = makeTransition({
      action: new Float64Array([1, 0, 1, 0]),
      qValues: new Float64Array([0.5, 0.3, 0.4, 0.6, 0.7, 0.1, 0.2, 0.8]),
    })
    const tdErrors = new Float64Array([0.1, -0.2, 0.3, -0.4])
    const errors = computeQLOutputErrorsPerButton(transition, tdErrors, 4)
    expect(errors.length).toBe(8)
  })

  it('places error at correct index for each button pair', () => {
    // 2 buttons: [Q_on_0, Q_off_0, Q_on_1, Q_off_1]
    // action = [1, 0] -> button 0 = on (idx 0 in pair), button 1 = off (idx 1 in pair)
    const transition = makeTransition({
      action: new Float64Array([1, 0]),
      qValues: new Float64Array([0.5, 0.3, 0.4, 0.6]),
    })
    const tdErrors = new Float64Array([0.2, -0.1])
    const errors = computeQLOutputErrorsPerButton(transition, tdErrors, 2)

    // Button 0: on -> chosen idx = 0 -> errors[0] = 0.2, errors[1] = 0
    expect(errors[0]).toBe(0.2)
    expect(errors[1]).toBe(0)
    // Button 1: off -> chosen idx = 1 -> errors[2] = 0, errors[3] = -0.1
    expect(errors[2]).toBe(0)
    expect(errors[3]).toBe(-0.1)
  })

  it('independent errors per button pair', () => {
    // Each button pair gets its own TD error, independent of others
    const transition = makeTransition({
      action: new Float64Array([1, 1, 0]),
      qValues: new Float64Array([0.5, 0.3, 0.4, 0.2, 0.1, 0.6]),
    })
    const tdErrors = new Float64Array([0.1, -0.2, 0.3])
    const errors = computeQLOutputErrorsPerButton(transition, tdErrors, 3)

    // Button 0: on -> errors[0] = 0.1
    expect(errors[0]).toBe(0.1)
    expect(errors[1]).toBe(0)
    // Button 1: on -> errors[2] = -0.2
    expect(errors[2]).toBe(-0.2)
    expect(errors[3]).toBe(0)
    // Button 2: off -> errors[5] = 0.3
    expect(errors[4]).toBe(0)
    expect(errors[5]).toBe(0.3)
  })
})
