import { describe, expect, it } from 'vitest'

import { mean } from '../../src/aggregation/mean.js'
import { median } from '../../src/aggregation/median.js'
import { summary } from '../../src/aggregation/summary.js'
import { standardDeviation, variance } from '../../src/aggregation/variance.js'

describe('aggregation', () => {
  describe('mean', () => {
    it('computes arithmetic mean', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3)
    })

    it('returns 0 for empty array', () => {
      expect(mean([])).toBe(0)
    })
  })

  describe('median', () => {
    it('returns middle value for odd-length array', () => {
      expect(median([1, 3, 5])).toBe(3)
    })

    it('returns average of two middle values for even-length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5)
    })

    it('returns 0 for empty array', () => {
      expect(median([])).toBe(0)
    })
  })

  describe('variance', () => {
    it('computes population variance', () => {
      expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4)
    })

    it('returns 0 for empty array', () => {
      expect(variance([])).toBe(0)
    })
  })

  describe('standardDeviation', () => {
    it('computes population standard deviation', () => {
      expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2)
    })
  })

  describe('summary', () => {
    it('returns full summary', () => {
      const result = summary([1, 2, 3, 4, 5])

      expect(result.count).toBe(5)
      expect(result.min).toBe(1)
      expect(result.max).toBe(5)
      expect(result.mean).toBe(3)
      expect(result.median).toBe(3)
      expect(result.variance).toBe(2)
      expect(result.standardDeviation).toBeCloseTo(Math.sqrt(2))
    })

    it('returns zeros for empty array', () => {
      const result = summary([])
      expect(result.count).toBe(0)
      expect(result.mean).toBe(0)
    })
  })
})
