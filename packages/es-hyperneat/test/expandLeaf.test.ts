import { describe, expect, test } from 'vitest'

import { type TestCase, testCases } from './fixtures/expand_leaf/index.js'

describe('QuadPoint.expand', () => {
  test.each([
    ...testCases.entries(),
  ])('should expand leaf for test case #%d', (_index, testCase: TestCase) => {
    const result = Array.from(testCase.leaf.expand(testCase.deltaWeight) ?? [])
    expect(result).toEqual(testCase.expandedLeaves)
  })
})
