import type {
  FitnessData,
  GenomeEntries,
  GenomeEntry,
} from '@neat-evolution/evaluator'
import { describe, test, expectTypeOf } from 'vitest'

import type { EvaluationContext, EvaluationStrategy } from '../src/index.js'

describe('EvaluationContext', () => {
  // eslint-disable-next-line vitest/expect-expect
  test('should have correct type structure', () => {
    type Context = EvaluationContext<any>

    expectTypeOf<Context>().toHaveProperty('evaluateGenomeEntry')
    expectTypeOf<Context>().toHaveProperty('evaluateGenomeEntryBatch')
  })
})

describe('EvaluationStrategy', () => {
  // eslint-disable-next-line vitest/expect-expect
  test('should have evaluate method with correct signature', () => {
    type Strategy = EvaluationStrategy<any>

    expectTypeOf<Strategy>().toHaveProperty('evaluate')
    expectTypeOf<Strategy['evaluate']>().toBeFunction()
  })

  // eslint-disable-next-line vitest/expect-expect
  test('should return AsyncIterable<FitnessData>', async () => {
    const mockStrategy: EvaluationStrategy<any> = {
      evaluate: async function* (
        context: EvaluationContext<any>,
        genomeEntries: GenomeEntries<any>
      ): AsyncIterable<FitnessData> {
        yield [0, 0, 1.0] as FitnessData
      },
    }

    const result = mockStrategy.evaluate({} as any, [] as any)
    expectTypeOf(result).toEqualTypeOf<AsyncIterable<FitnessData>>()
  })
})
