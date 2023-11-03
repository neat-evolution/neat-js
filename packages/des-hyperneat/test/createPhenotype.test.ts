import { toLinkKey, type LinkKey } from '@neat-js/core'
import { describe, expect, test } from 'vitest'

import { createPhenotype } from '../src/index.js'

import { type TestCase, testCases } from './fixtures/genotype_actions/index.js'

describe('createPhenotype', () => {
  test.each([...testCases.entries()])(
    'should export the same factoryOptions for test case #%d',
    (_index, testCase: TestCase) => {
      const { genome, factoryOptions } = testCase
      const result = genome.toFactoryOptions()
      expect(result).toEqual(factoryOptions)
    }
  )

  test.each([...testCases.entries()])(
    'should have the correct connections for test case #%d',
    (_index, testCase: TestCase) => {
      const { genome, connections } = testCase
      const result = Array.from(genome.connections.connections())
      // same number of connections
      expect(result.length).toEqual(connections.length)

      // same links (may be in different order)
      const linkKeys = new Set<LinkKey>()
      for (const [from, to] of connections) {
        const key = toLinkKey(from, to)
        linkKeys.add(key)
      }
      for (const [from, to] of result) {
        const key = toLinkKey(from, to)
        expect(linkKeys.has(key)).toBeTruthy()
      }
    }
  )

  test.each([...testCases.entries()])(
    'should create a phenotype for test case #%d',
    (_index, testCase: TestCase) => {
      const { genome, phenotype } = testCase
      const result = createPhenotype(genome)
      console.log(result)
      expect(result.length).toEqual(phenotype.length)
      expect(result.inputs).toEqual(phenotype.inputs)
      expect(result.outputs).toEqual(phenotype.outputs)
      expect(result.actions.length).toEqual(phenotype.actions.length)
    }
  )
})
