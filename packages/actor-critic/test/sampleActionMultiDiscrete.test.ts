import { describe, expect, it } from 'vitest'
import { sampleActionMultiDiscrete } from '../src/features/multi-discrete/sampleActionMultiDiscrete.js'

describe('sampleActionMultiDiscrete', () => {
  it('returns N-length array (not 2N)', () => {
    const factorCount = 3
    const probabilities = new Float64Array([0.8, 0.2, 0.6, 0.4, 0.3, 0.7])
    const action = sampleActionMultiDiscrete(
      probabilities,
      factorCount,
      () => 0.5
    )
    expect(action.length).toBe(factorCount)
  })

  it('each value is 0 or 1', () => {
    const factorCount = 4
    const probabilities = new Float64Array([
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
    ])
    let callIndex = 0
    const rngValues = [0.1, 0.9, 0.3, 0.7]
    const rng = () => {
      const val = rngValues[callIndex % rngValues.length]
      callIndex++
      if (val === undefined) throw new Error('RNG value undefined')
      return val
    }
    const action = sampleActionMultiDiscrete(probabilities, factorCount, rng)
    for (let i = 0; i < action.length; i++) {
      const val = action[i] as number
      expect(val === 0 || val === 1).toBe(true)
    }
  })

  it('deterministic with known RNG: rng < pOn yields 1', () => {
    const factorCount = 2
    // Factor 0: pOn=0.8, pOff=0.2; Factor 1: pOn=0.3, pOff=0.7
    const probabilities = new Float64Array([0.8, 0.2, 0.3, 0.7])
    // rng returns 0.5 for both factors
    const action = sampleActionMultiDiscrete(
      probabilities,
      factorCount,
      () => 0.5
    )
    // Factor 0: 0.5 < 0.8 → 1 (on)
    expect(action[0]).toBe(1)
    // Factor 1: 0.5 >= 0.3 → 0 (off)
    expect(action[1]).toBe(0)
  })

  it('rng exactly at pOn yields 0 (off)', () => {
    const factorCount = 1
    const probabilities = new Float64Array([0.5, 0.5])
    // rng returns exactly 0.5 — not < 0.5, so off
    const action = sampleActionMultiDiscrete(
      probabilities,
      factorCount,
      () => 0.5
    )
    expect(action[0]).toBe(0)
  })

  it('samples from correct pair (pOn vs pOff)', () => {
    const factorCount = 3
    // Factor 0: pOn=1.0 → always on; Factor 1: pOn=0.0 → always off; Factor 2: pOn=0.5
    const probabilities = new Float64Array([1.0, 0.0, 0.0, 1.0, 0.5, 0.5])
    const action = sampleActionMultiDiscrete(
      probabilities,
      factorCount,
      () => 0.5
    )
    expect(action[0]).toBe(1) // pOn=1.0, any rng < 1.0 → on
    expect(action[1]).toBe(0) // pOn=0.0, rng >= 0.0 is false for < check → off
    expect(action[2]).toBe(0) // pOn=0.5, rng=0.5 not < 0.5 → off
  })
})
