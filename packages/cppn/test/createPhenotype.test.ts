import { createSyncExecutor } from '@neat-evolution/executor'
import { describe, expect, test } from 'vitest'

import { createPhenotype } from '../src/index.js'

import { testCases, type TestCase } from './fixtures/cppn_phenotype/index.js'

const inputs = [
  [983040, -458752, 983040, -327680],
  [-851968, -196608, 851968, 983040],
  [851968, 327680, 983040, -983040],
  [-851968, -851968, -851968, 458752],
  [-851968, -983040, -983040, -196608],
  [983040, -720896, -851968, -589824],
  [851968, 196608, -983040, -720896],
  [-983040, 458752, -983040, 983040],
  [983040, 458752, -983040, 720896],
  [-983040, -458752, 983040, 851968],
  [-851968, -458752, 983040, -851968],
  [851968, -65536, 983040, 196608],
  [-983040, 196608, 851968, -983040],
  [983040, 720896, -983040, -589824],
  [-851968, 720896, 851968, -327680],
  [851968, 720896, 983040, 327680],
  [983040, 589824, 851968, -851968],
  [-851968, -65536, -851968, 983040],
  [-851968, 589824, -851968, 851968],
  [-983040, 851968, -851968, 65536],
  [851968, 589824, -983040, 327680],
  [983040, -589824, -851968, 196608],
  [-983040, -327680, -851968, -720896],
  [-983040, -851968, -851968, -327680],
  [-983040, 589824, 851968, 65536],
  [851968, 458752, 983040, 65536],
  [983040, -196608, 851968, -720896],
  [-983040, 65536, 983040, 983040],
  [851968, -589824, 983040, -65536],
  [851968, 851968, 851968, -458752],
  [-851968, 327680, -983040, -65536],
  [-983040, -983040, 851968, -196608],
]

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
    'should return the same outputs for test case #%d',
    (_index, testCase: TestCase) => {
      const { genome, phenotype } = testCase
      const executorA = createSyncExecutor(createPhenotype(genome))
      const executorB = createSyncExecutor(phenotype)
      for (const input of inputs) {
        const result = executorA(input) as [number, number]
        const expected = executorB(input) as [number, number]
        expect(result[0]).toBeCloseTo(expected[0], 5)
        expect(result[1]).toBeCloseTo(expected[1], 5)
      }
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
})
