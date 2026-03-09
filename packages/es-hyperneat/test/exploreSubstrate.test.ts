import type { Connection } from '@neat-evolution/core'
import { createPhenotype } from '@neat-evolution/cppn'
import type { Point } from '@neat-evolution/hyperneat'
import { describe, expect, test } from 'vitest'

import { exploreSubstrate } from '../src/index.js'

import { type TestCase, testCases } from './fixtures/explore_substrate/index.js'

const sortLayers = (layers: Point[][]): Point[][] => {
  return layers.map((layer) => {
    return layer.sort((a, b) => {
      return a[0] - b[0] || a[1] - b[1]
    })
  })
}

const sortConnections = (
  connections: Array<Connection<number, number>>
): Array<Connection<number, number>> => {
  return [...connections].sort((a, b) => {
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
  })
}

describe('exploreSubstrate', () => {
  test.each([
    ...testCases.entries(),
  ])('should export the same factoryOptions for test case #%d', (_index, testCase: TestCase) => {
    const { genome, factoryOptions } = testCase
    const result = genome.toFactoryOptions()
    expect(result).toEqual(factoryOptions)
  })

  test.each([
    ...testCases.entries(),
  ])('should create a phenotype for test case #%d', (_index, testCase: TestCase) => {
    const { genome, phenotype } = testCase
    const result = createPhenotype(genome)
    expect(result.length).toEqual(phenotype.length)
    expect(result.inputs).toEqual(phenotype.inputs)
    expect(result.outputs).toEqual(phenotype.outputs)
    expect(result.actions.length).toEqual(phenotype.actions.length)
  })

  test.each([
    ...testCases.entries(),
  ])('should return nodes for test case #%d', (_index, testCase: TestCase) => {
    const [nodes] = exploreSubstrate(...testCase.args)
    expect(sortLayers(nodes)).toEqual(sortLayers(testCase.nodes))
  })

  test.each([
    ...testCases.entries(),
  ])('should return connections for test case #%d', (_index, testCase: TestCase) => {
    const [, connections] = exploreSubstrate(...testCase.args)
    const actual = sortConnections(connections)
    const expected = sortConnections(testCase.connections)
    for (const [i, connection] of actual.entries()) {
      const expectedConnection = expected[i] as [number, number, number]
      expect(connection[0]).toEqual(expectedConnection[0])
      expect(connection[1]).toEqual(expectedConnection[1])
      expect(connection[2]).toBeCloseTo(expectedConnection[2], 10)
    }
  })
})
