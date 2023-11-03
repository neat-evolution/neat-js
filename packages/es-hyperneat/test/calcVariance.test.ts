import { describe, expect, test } from 'vitest'

import { testCases, type TestCase } from './fixtures/calc_variance/index.js'

describe('QuadPoint.calcVariance', () => {
  test.each([...testCases.entries()])(
    'should calcVariance for test case #%d',
    (_index, testCase: TestCase) => {
      const result = testCase.quadPoint.calcVariance(...testCase.args)
      expect(result).toEqual(testCase.variance)
    }
  )
})
