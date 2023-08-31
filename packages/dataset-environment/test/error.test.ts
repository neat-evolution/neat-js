import { describe, expect, test } from 'vitest'

import {
  mseSingle,
  normalize,
  type Matrix,
  type Vector,
  mse,
  crossentropySingle,
  crossentropy,
} from '../src/index.js'

describe('error', () => {
  describe('normalize', () => {
    test('should return a normalized vector', () => {
      const vec = [1, 2, 3]
      const result = normalize(vec)
      const expected = [1 / 6, 1 / 3, 1 / 2]
      expect(result).toEqual(expected)
    })

    test('should return the same vector if sum is zero', () => {
      const vec = [0, 0, 0]
      const result = normalize(vec)
      expect(result).toEqual(vec)
      expect(result).not.toBe(vec)
    })
    test('normalize should handle empty vectors', () => {
      const vec: Vector = []
      const result = normalize(vec)

      expect(result).toEqual(vec)
      expect(result).not.toBe(vec)
    })
  })
  describe('mse', () => {
    test('should return the correct MSE with normalization', () => {
      const targets = [
        [1, 0, 1],
        [0, 1, 0],
      ]
      const predictions = [
        [0.9, 0.1, 0.9],
        [0.1, 0.9, 0.1],
      ]
      const result = mse(targets, predictions, true)
      const expected =
        (mseSingle([1, 0, 1], [0.9, 0.1, 0.9], true) +
          mseSingle([0, 1, 0], [0.1, 0.9, 0.1], true)) /
        2
      expect(result).toBeCloseTo(expected)
    })

    test('should return the correct MSE without normalization', () => {
      const targets = [
        [1, 0, 1],
        [0, 1, 0],
      ]
      const predictions = [
        [0.9, 0.1, 0.9],
        [0.1, 0.9, 0.1],
      ]
      const result = mse(targets, predictions, false)
      const expected =
        (mseSingle([1, 0, 1], [0.9, 0.1, 0.9], false) +
          mseSingle([0, 1, 0], [0.1, 0.9, 0.1], false)) /
        2
      expect(result).toBeCloseTo(expected)
    })

    test('should handle empty matrices', () => {
      const targets: Matrix = []
      const predictions: Matrix = []
      const result = mse(targets, predictions, true)
      expect(result).toBe(0)
    })

    test('should handle matrices with mismatched lengths', () => {
      const targets = [[1, 0, 1]]
      const predictions = [
        [0.9, 0.1, 0.9],
        [0.1, 0.9, 0.1],
      ]
      let error: any
      try {
        mse(targets, predictions, true)
      } catch (e) {
        error = e
      }
      expect(error).toBeDefined()
      expect(error?.message).toBe(
        'Mismatched lengths between targets and predictions'
      )
    })

    test('should handle zero-length inner arrays', () => {
      const targets: Matrix = [[]]
      const predictions: Matrix = [[]]
      const result = mse(targets, predictions, true)
      expect(result).toBe(0)
    })
  })
  describe('mseSingle', () => {
    test('should return the correct MSE with normalization', () => {
      const target = [1, 0, 1]
      const prediction = [0.9, 0.1, 0.9]
      const normalizedPrediction = normalize(prediction)
      const result = mseSingle(target, prediction, true)
      const expected =
        (((target[0] as number) - (normalizedPrediction[0] as number)) ** 2 +
          ((target[1] as number) - (normalizedPrediction[1] as number)) ** 2 +
          ((target[2] as number) - (normalizedPrediction[2] as number)) ** 2) /
        3
      expect(result).toBeCloseTo(expected)
    })

    test('should return the correct MSE without normalization', () => {
      const target = [1, 0, 1]
      const prediction = [0.9, 0.1, 0.9]
      const result = mseSingle(target, prediction, false)
      const expected = ((1 - 0.9) ** 2 + (0 - 0.1) ** 2 + (1 - 0.9) ** 2) / 3
      expect(result).toBeCloseTo(expected)
    })

    test('should throw for empty target vector', () => {
      const target: Vector = []
      const prediction = [0.9, 0.1, 0.9]
      let error: any
      try {
        mseSingle(target, prediction, true)
      } catch (e) {
        error = e
      }
      expect(error).toBeDefined()
      expect(error?.message).toBe(
        'Mismatched lengths between target and prediction vectors.'
      )
    })

    test('should throw for target and prediction vectors of different lengths', () => {
      const target = [1, 0, 1]
      const prediction = [0.9, 0.1]

      let error: any
      try {
        mseSingle(target, prediction, true)
      } catch (e) {
        error = e
      }
      expect(error).toBeDefined()
      expect(error?.message).toBe(
        'Mismatched lengths between target and prediction vectors.'
      )
    })
  })
  describe('crossentropy', () => {
    test('should handle empty matrices', () => {
      const targets: Matrix = []
      const predictions: Matrix = []
      const result = crossentropy(targets, predictions, true)
      expect(result).toBe(0)
    })

    test('should return correct value with matched non-empty matrices, with normalization', () => {
      const targets = [
        [1, 0, 1],
        [0, 1, 0],
      ]
      const predictions = [
        [0.9, 0.1, 0.9],
        [0.1, 0.9, 0.1],
      ]
      const result = crossentropy(targets, predictions, true)
      const expected = 0.8475497495612967
      expect(result).toBeCloseTo(expected)
    })

    test('should return correct value with matched non-empty matrices, without normalization', () => {
      const targets = [
        [1, 0, 1],
        [0, 1, 0],
      ]
      const predictions = [
        [0.9, 0.1, 0.9],
        [0.1, 0.9, 0.1],
      ]
      const result = crossentropy(targets, predictions, false)
      const expected = 0.8475497495612967
      expect(result).toBeCloseTo(expected)
    })

    test('should throw error with mismatched matrices', () => {
      const targets = [[1, 0, 1]]
      const predictions = [
        [0.9, 0.1, 0.9],
        [0.1, 0.9, 0.1],
      ]
      let error: any
      try {
        crossentropy(targets, predictions, true)
      } catch (e) {
        error = e
      }
      expect(error).toBeDefined()
      expect(error?.message).toBe(
        'Mismatched lengths between targets and predictions'
      )
    })
  })
  describe('crossentropySingle', () => {
    test('should return correct value with normalization', () => {
      const target = [1, 0, 1]
      const prediction = [0.9, 0.1, 0.9]
      const result = crossentropySingle(target, prediction, true)
      const expected = 1.4944
      expect(result).toBeCloseTo(expected)
    })

    test('should return correct value without normalization', () => {
      const target = [1, 0, 1]
      const prediction = [0.9, 0.1, 0.9]
      const result = crossentropySingle(target, prediction, false)
      const expected = 1.4944
      expect(result).toBeCloseTo(expected)
    })

    test('should handle mismatched vector lengths', () => {
      const target = [1, 0]
      const prediction = [0.9, 0.05, 0.05]
      let error: any
      try {
        crossentropySingle(target, prediction, true)
      } catch (e) {
        error = e
      }
      expect(error).toBeDefined()
      expect(error?.message).toBe(
        'Mismatched lengths between target and prediction vectors.'
      )
    })

    test('should handle empty vectors', () => {
      const target: Vector = []
      const prediction: Vector = []
      const result = crossentropySingle(target, prediction, true)
      expect(result).toBe(0)
    })
  })
})
