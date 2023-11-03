import { createPhenotype } from '@neat-js/cppn'
import { type Point } from '@neat-js/hyperneat'
import { describe, expect, test } from 'vitest'

import { exploreSubstrate } from '../src/index.js'

import { testCases, type TestCase } from './fixtures/explore_substrate/index.js'

const sortLayers = (layers: Point[][]): Point[][] => {
  return layers.map((layer) => {
    return layer.sort((a, b) => {
      return a[0] - b[0] || a[1] - b[1]
    })
  })
}

describe('exploreSubstrate', () => {
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
    'should return nodes for test case #%d',
    (_index, testCase: TestCase) => {
      const [nodes] = exploreSubstrate(...testCase.args)
      expect(sortLayers(nodes)).toEqual(sortLayers(testCase.nodes))
    }
  )

  test.each([...testCases.entries()])(
    'should return connections for test case #%d',
    (_index, testCase: TestCase) => {
      const [, connections] = exploreSubstrate(...testCase.args)
      for (const [i, connection] of connections.entries()) {
        const expected = testCase.connections[i] as [string, string, number]
        expect(connection[0]).toEqual(expected[0])
        expect(connection[1]).toEqual(expected[1])
        expect(connection[2]).toBeCloseTo(expected[2], 10)
      }
    }
  )
})
