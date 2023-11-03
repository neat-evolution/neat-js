import type { Target } from '@neat-js/core'
import type { PointKey } from '@neat-js/hyperneat'
import { describe, expect, test } from 'vitest'

import type { WeightFn } from '../src/index.js'

import { testCases, type TestCase } from './fixtures/extract_leaf/index.js'

// const sortTargets = (
//   targets: Array<Target<string, number>>
// ): Array<Target<string, number>> => {
//   return targets.sort((a, b) => {
//     return a.node > b.node ? 1 : a.node < b.node ? -1 : a.edge - b.edge
//   })
// }

const cloneArgs = (
  args: [
    f: WeightFn,
    connections: Array<Target<PointKey, number>>,
    deltaWeight: number
  ]
) => {
  return [args[0], args[1].map((target) => ({ ...target })), args[2]] as [
    f: WeightFn,
    connections: Array<Target<PointKey, number>>,
    deltaWeight: number
  ]
}

describe('QuadPoint.extract', () => {
  test.each([...testCases.entries()])(
    'should export the same factoryOptions for test case #%d',
    (_index, testCase: TestCase) => {
      const { genome, factoryOptions } = testCase
      const result = genome.toFactoryOptions()
      expect(result).toEqual(factoryOptions)
    }
  )

  test.each([...testCases.entries()])(
    'should return the same band values for test case #%d',
    async (_index, testCase: TestCase) => {
      const { args, bandValues } = testCase
      const f = args[0]
      for (const bandValue of bandValues) {
        const leftMinus = f(bandValue.x - bandValue.width, bandValue.y)
        const rightMinus = f(bandValue.x + bandValue.width, bandValue.y)
        const upMinus = f(bandValue.x, bandValue.y - bandValue.width)
        const downMinus = f(bandValue.x, bandValue.y + bandValue.width)
        expect(leftMinus).toBeCloseTo(bandValue.leftMinus, 10)
        expect(rightMinus).toBeCloseTo(bandValue.rightMinus, 10)
        expect(upMinus).toBeCloseTo(bandValue.upMinus, 10)
        expect(downMinus).toBeCloseTo(bandValue.downMinus, 10)
      }
    }
  )

  test.each([...testCases.entries()])(
    'should extract leaf for test case #%d',
    (_index, testCase: TestCase) => {
      const args = cloneArgs(testCase.args)
      const result = Array.from(testCase.leaf.extract(...args))
      expect(result.length).toEqual(testCase.extractedLeaves.length)
      expect(result).toEqual(testCase.extractedLeaves)
    }
  )

  test.each([...testCases.entries()])(
    'should mutate connections for test case #%d',
    async (_index, testCase: TestCase) => {
      const args = cloneArgs(testCase.args)
      expect(args[1]).toEqual(testCase.beforeConnections)
      Array.from(testCase.leaf.extract(...args))
      expect(args[1]).toEqual(testCase.afterConnections)
      for (const [i, target] of args[1].entries()) {
        const expected = testCase.afterConnections[i] as Target<string, number>
        expect(target.node).toEqual(expected.node)
        expect(target.edge).toBeCloseTo(expected.edge, 10)
      }
    }
  )
})
