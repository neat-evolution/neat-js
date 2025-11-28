import type { FitnessData, GenomeEntry } from '@neat-evolution/evaluator'
import { describe, test, expect, vi } from 'vitest'

import type { EvaluationContext } from '../../src/EvaluationContext.js'
import { IndividualStrategy } from '../../src/strategies/IndividualStrategy.js'

describe('IndividualStrategy', () => {
  test('should call evaluateGenomeEntry for each genome', async () => {
    const context: EvaluationContext<any> = {
      evaluateGenomeEntry: vi.fn(
        async (entry: GenomeEntry<any>): Promise<FitnessData> => {
          return [entry[0], entry[1], 1.0]
        }
      ),
      evaluateGenomeEntryBatch: vi.fn(),
    }

    const strategy = new IndividualStrategy()
    const genomeEntries: Array<GenomeEntry<any>> = [
      [0, 0, {}],
      [0, 1, {}],
      [1, 0, {}],
    ]

    const results: FitnessData[] = []
    for await (const result of strategy.evaluate(context, genomeEntries)) {
      results.push(result)
    }

    expect(context.evaluateGenomeEntry).toHaveBeenCalledTimes(3)
    expect(results).toHaveLength(3)
    expect(results[0]).toEqual([0, 0, 1.0])
    expect(results[1]).toEqual([0, 1, 1.0])
    expect(results[2]).toEqual([1, 0, 1.0])
  })
})
