import { describe, expect, it } from 'vitest'

import { crossEntropy } from '../../src/loss/crossEntropy.js'
import { mse } from '../../src/loss/mse.js'

describe('loss functions', () => {
  describe('mse', () => {
    it('computes mean squared error', () => {
      expect(mse([1, 2, 3], [1, 2, 3])).toBe(0)
      expect(mse([1, 2, 3], [2, 3, 4])).toBe(1)
    })

    it('throws on length mismatch', () => {
      expect(() => mse([1, 2], [1])).toThrow('Length mismatch')
    })

    it('returns 0 for empty arrays', () => {
      expect(mse([], [])).toBe(0)
    })
  })

  describe('crossEntropy', () => {
    it('returns 0-ish for perfect predictions', () => {
      const result = crossEntropy([0.999, 0.001], [1, 0])
      expect(result).toBeLessThan(0.01)
    })

    it('returns high loss for wrong predictions', () => {
      const result = crossEntropy([0.01, 0.99], [1, 0])
      expect(result).toBeGreaterThan(2)
    })

    it('throws on length mismatch', () => {
      expect(() => crossEntropy([0.5], [1, 0])).toThrow('Length mismatch')
    })
  })
})
