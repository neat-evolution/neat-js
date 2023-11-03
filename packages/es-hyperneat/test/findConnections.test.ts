import type { Target } from '@neat-js/core'
import { createPhenotype } from '@neat-js/cppn'
import { describe, expect, test } from 'vitest'

import { findConnections } from '../src/index.js'

import { testCases, type TestCase } from './fixtures/find_connections/index.js'

const sortTargets = (targets: Array<Target<string, number>>) => {
  return [...targets].sort((a, b) => {
    return a.node > b.node ? 1 : a.node < b.node ? -1 : a.edge - b.edge
  })
}

describe('findConnections', () => {
  test.each([...testCases.entries()])(
    'should export the same factoryOptions for test case #%d',
    (_index, testCase: TestCase) => {
      const { genome, factoryOptions } = testCase
      const result = genome.toFactoryOptions()
      expect(result).toEqual(factoryOptions)
    }
  )

  test.each([...testCases.entries()])(
    'should create a phenotype for test case #%d',
    (_index, testCase: TestCase) => {
      const { genome, phenotype } = testCase
      const result = createPhenotype(genome)
      expect(result.length).toEqual(phenotype.length)
      expect(result.inputs).toEqual(phenotype.inputs)
      expect(result.outputs).toEqual(phenotype.outputs)
      expect(result.actions.length).toEqual(phenotype.actions.length)
    }
  )

  test.each([...testCases.entries()])(
    'should return targets for test case #%d',
    (_index, testCase: TestCase) => {
      const targets = findConnections(...testCase.args)
      expect(sortTargets(targets)).toEqual(sortTargets(testCase.targets))
    }
  )
})
