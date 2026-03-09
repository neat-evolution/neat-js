import type { FitnessData, GenomeEntry } from '@neat-evolution/evaluator'
import { describe, expect, test, vi } from 'vitest'

import type { EvaluationContext } from '../../src/EvaluationContext.js'
import { IndividualStrategy } from '../../src/strategies/IndividualStrategy.js'

describe('IndividualStrategy', () => {
  test('should call evaluateGenomeEntry for each genome', async () => {
    const dummyGenome = {} as unknown as GenomeEntry[2]

    const context = {
      evaluateGenomeEntry: vi.fn(
        async (entry: GenomeEntry): Promise<FitnessData> => {
          return [entry[0], entry[1], 1.0]
        }
      ),
      evaluateGenomeEntryBatch: vi.fn(),
    } as unknown as EvaluationContext

    const strategy = new IndividualStrategy()
    const genomeEntries: Array<GenomeEntry> = [
      [0, 0, dummyGenome],
      [0, 1, dummyGenome],
      [1, 0, dummyGenome],
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
