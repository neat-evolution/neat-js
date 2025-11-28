import { describe, test, expect } from 'vitest'

import type {
  EvaluationContext,
  GenomeEntry,
  FitnessData,
} from '../src/index.js'

describe('EvaluationContext', () => {
  test('can be implemented with both required methods', () => {
    class TestContext implements EvaluationContext {
      async evaluateSingle(entry: GenomeEntry<any>): Promise<FitnessData> {
        return [entry[0], entry[1], 1.0]
      }

      async evaluateBatch(
        entries: Array<GenomeEntry<any>>
      ): Promise<FitnessData[]> {
        return entries.map((e) => [e[0], e[1], 1.0])
      }
    }

    const context = new TestContext()
    expect(typeof context.evaluateSingle).toBe('function')
    expect(typeof context.evaluateBatch).toBe('function')
  })

  test('evaluateSingle returns FitnessData tuple', async () => {
    const context: EvaluationContext = {
      async evaluateSingle(entry) {
        return [entry[0], entry[1], 42.5]
      },
      async evaluateBatch(entries) {
        return entries.map((e) => [e[0], e[1], 1.0])
      },
    }

    const entry: GenomeEntry<any> = [2, 5, {} as any]
    const result = await context.evaluateSingle(entry)

    expect(result).toEqual([2, 5, 42.5])
    expect(result[0]).toBe(2) // species index
    expect(result[1]).toBe(5) // organism index
    expect(result[2]).toBe(42.5) // fitness
  })

  test('evaluateBatch returns array of FitnessData in same order', async () => {
    const context: EvaluationContext = {
      async evaluateSingle(entry) {
        return [entry[0], entry[1], 1.0]
      },
      async evaluateBatch(entries) {
        return entries.map((e, i) => [e[0], e[1], i * 10])
      },
    }

    const batch: Array<GenomeEntry<any>> = [
      [0, 1, {} as any],
      [0, 2, {} as any],
      [1, 0, {} as any],
    ]
    const results = await context.evaluateBatch(batch)

    expect(results).toHaveLength(3)
    expect(results[0]).toEqual([0, 1, 0])
    expect(results[1]).toEqual([0, 2, 10])
    expect(results[2]).toEqual([1, 0, 20])
  })
})
