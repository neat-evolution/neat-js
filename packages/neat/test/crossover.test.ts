import type { GenomeDataLink } from '@neat-js/core'
import { describe, expect, test } from 'vitest'

import type { DefaultNEATGenome } from '../src/DefaultNEATGenome.js'

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
    a: DefaultNEATGenome,
    b: DefaultNEATGenome,
    fitness1: number,
    fitness2: number,
    expected: DefaultNEATGenome
  ]
>

describe('Genome crossover fixtures', () => {
  test.each(formattedTestCases)(
    '%s',
    (
      name: string,
      a: DefaultNEATGenome,
      b: DefaultNEATGenome,
      fitness1: number,
      fitness2: number,
      expected: DefaultNEATGenome
    ) => {
      const result = a.crossover(b, fitness1, fitness2)
      const resultJSON = JSON.parse(JSON.stringify(result.toJSON()))
      const expectedJSON = JSON.parse(JSON.stringify(expected.toJSON()))

      // sort links by innovation
      resultJSON.links.sort(
        (a: GenomeDataLink, b: GenomeDataLink) => a[3] - b[3]
      )
      expectedJSON.links.sort(
        (a: GenomeDataLink, b: GenomeDataLink) => a[3] - b[3]
      )
      expect(resultJSON).toEqual(expectedJSON)
    }
  )
})
