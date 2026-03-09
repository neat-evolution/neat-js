import { createPhenotype } from '@neat-evolution/cppn'
import type { Point } from '@neat-evolution/hyperneat'
import { describe, expect, test } from 'vitest'

import { findConnectionsPoints } from '../src/index.js'

import { type TestCase, testCases } from './fixtures/find_connections/index.js'

const sortTargets = (targets: Array<{ node: Point; edge: number }>) => {
  return [...targets].sort((a, b) => {
    return a.node[0] - b.node[0] || a.node[1] - b.node[1] || a.edge - b.edge
  })
}

describe('findConnectionsPoints', () => {
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
  ])('should return targets for test case #%d', (_index, testCase: TestCase) => {
    const targets = findConnectionsPoints(...testCase.args)
    expect(sortTargets(targets)).toEqual(sortTargets(testCase.targets))
  })
})
