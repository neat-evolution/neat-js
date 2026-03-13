import { describe, expect, it } from 'vitest'
import {
  applyActorActivation,
  sigmoid,
  sigmoidDerivative,
  softmax,
  tanh,
  tanhDerivative,
} from '../src/activations.js'

describe('sigmoid', () => {
  it('returns 0.5 for input 0', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5)
  })

  it('returns values in (0, 1)', () => {
    expect(sigmoid(-10)).toBeGreaterThan(0)
    expect(sigmoid(-10)).toBeLessThan(1)
    expect(sigmoid(10)).toBeGreaterThan(0)
    expect(sigmoid(10)).toBeLessThan(1)
  })

  it('is monotonically increasing', () => {
    expect(sigmoid(1)).toBeGreaterThan(sigmoid(0))
    expect(sigmoid(0)).toBeGreaterThan(sigmoid(-1))
  })
})

describe('sigmoidDerivative', () => {
  it('is maximized at a=0.5 (input=0)', () => {
    expect(sigmoidDerivative(0.5)).toBeCloseTo(0.25)
  })

  it('approaches 0 at extremes', () => {
    expect(sigmoidDerivative(0.01)).toBeLessThan(0.01)
    expect(sigmoidDerivative(0.99)).toBeLessThan(0.01)
  })
})

describe('tanh', () => {
  it('returns 0 for input 0', () => {
    expect(tanh(0)).toBeCloseTo(0)
  })

  it('returns values in (-1, 1)', () => {
    expect(tanh(-10)).toBeGreaterThan(-1)
    expect(tanh(10)).toBeLessThan(1)
  })
})

describe('tanhDerivative', () => {
  it('is maximized at a=0 (input=0)', () => {
    expect(tanhDerivative(0)).toBeCloseTo(1)
  })

  it('approaches 0 at extremes', () => {
    expect(tanhDerivative(0.99)).toBeLessThan(0.05)
  })
})

describe('softmax', () => {
  it('outputs sum to 1', () => {
    const result = softmax(new Float64Array([1, 2, 3]))
    const sum = result.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('larger inputs get larger probabilities', () => {
    const result = softmax(new Float64Array([1, 2, 3]))
    expect(result[2] as number).toBeGreaterThan(result[1] as number)
    expect(result[1] as number).toBeGreaterThan(result[0] as number)
  })

  it('equal inputs produce uniform distribution', () => {
    const result = softmax(new Float64Array([2, 2, 2]))
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(1 / 3)
    }
  })

  it('handles large values without overflow (max-subtraction trick)', () => {
    const result = softmax(new Float64Array([1000, 1001, 1002]))
    const sum = result.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
    expect(result[2] as number).toBeGreaterThan(result[1] as number)
  })
})

describe('applyActorActivation', () => {
  it('applies sigmoid element-wise', () => {
    const raw = new Float64Array([0, 1, -1])
    const result = applyActorActivation(raw, 'sigmoid')
    expect(result[0]).toBeCloseTo(0.5)
    expect(result[1]).toBeCloseTo(sigmoid(1))
    expect(result[2]).toBeCloseTo(sigmoid(-1))
  })

  it('applies softmax across all outputs', () => {
    const raw = new Float64Array([1, 2, 3])
    const result = applyActorActivation(raw, 'softmax')
    const sum = result.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('applies tanh element-wise', () => {
    const raw = new Float64Array([0, 1, -1])
    const result = applyActorActivation(raw, 'tanh')
    expect(result[0]).toBeCloseTo(0)
    expect(result[1]).toBeCloseTo(tanh(1))
    expect(result[2]).toBeCloseTo(tanh(-1))
  })
})
