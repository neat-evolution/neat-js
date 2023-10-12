import { describe, expect, test } from 'vitest'

import type { NEATGenome } from '../src/NEATGenome.js'
import type { NEATLinkData } from '../src/NEATGenomeFactoryOptions.js'

import { testCases } from './fixtures/crossover/testCases.js'

const formattedTestCases = testCases.map(
  ({ name, fitness1, fitness2, genome1, genome2, result }) => [
    name,
    genome1,
    genome2,
    fitness1,
    fitness2,
    result,
  ]
) as Array<
  [
    name: string,
    a: NEATGenome,
    b: NEATGenome,
    fitness1: number,
    fitness2: number,
    expected: NEATGenome
  ]
>

describe('Genome crossover fixtures', () => {
  test.each(formattedTestCases)(
    '%s',
    (
      name: string,
      a: NEATGenome,
      b: NEATGenome,
      fitness1: number,
      fitness2: number,
      expected: NEATGenome
    ) => {
      const result = a.crossover(b, fitness1, fitness2)
      const resultJSON = JSON.parse(JSON.stringify(result.toJSON()))
      const expectedJSON = JSON.parse(JSON.stringify(expected.toJSON()))

      // sort links by innovation
      resultJSON.factoryOptions.links.sort(
        (a: NEATLinkData, b: NEATLinkData) => a[3] - b[3]
      )
      expectedJSON.factoryOptions.links.sort(
        (a: NEATLinkData, b: NEATLinkData) => a[3] - b[3]
      )
      expect(resultJSON).toEqual(expectedJSON)
    }
  )
})
