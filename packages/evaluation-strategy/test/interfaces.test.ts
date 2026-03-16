import type { FitnessData, GenomeEntries } from '@neat-evolution/evaluator'
import { describe, expectTypeOf, test } from 'vitest'

import type {
  EvaluationStrategy,
  ParentEvaluationContext,
} from '../src/index.js'

describe('ParentEvaluationContext', () => {
  // eslint-disable-next-line vitest/expect-expect
  test('should have correct type structure', () => {
    type Context = ParentEvaluationContext

    expectTypeOf<Context>().toHaveProperty('evaluateGenomeEntry')
    expectTypeOf<Context>().toHaveProperty('evaluateGenomeEntryBatch')
  })
})

describe('EvaluationStrategy', () => {
  // eslint-disable-next-line vitest/expect-expect
  test('should have evaluate method with correct signature', () => {
    type Strategy = EvaluationStrategy

    expectTypeOf<Strategy>().toHaveProperty('evaluate')
    expectTypeOf<Strategy['evaluate']>().toBeFunction()
  })

  // eslint-disable-next-line vitest/expect-expect
  test('should return AsyncIterable<FitnessData>', async () => {
    const mockStrategy: EvaluationStrategy = {
      evaluate: async function* (
        _context: ParentEvaluationContext,
        _genomeEntries: GenomeEntries
      ): AsyncIterable<FitnessData> {
        yield [0, 0, 1.0] as FitnessData
      },
    }

    const result = mockStrategy.evaluate(
      {} as unknown as ParentEvaluationContext,
      [] as GenomeEntries
    )
    expectTypeOf(result).toEqualTypeOf<AsyncIterable<FitnessData>>()
  })
})
