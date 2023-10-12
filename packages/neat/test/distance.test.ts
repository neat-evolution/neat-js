import { describe, expect, test } from 'vitest'

import type { NEATGenome } from '../src/NEATGenome.js'

import { testCases } from './fixtures/distance/testCases.js'
const formattedTestCases = testCases.map(
  ({ name, distance, genome1, genome2 }) => [name, genome1, genome2, distance]
) as Array<[name: string, a: NEATGenome, b: NEATGenome, expected: number]>

describe('Genome distance fixtures', () => {
  test.each(formattedTestCases)(
    '%s',
    (name: string, a: NEATGenome, b: NEATGenome, expected: number) => {
      expect(a.distance(b)).toBeCloseTo(expected, 15)
    }
  )
})
