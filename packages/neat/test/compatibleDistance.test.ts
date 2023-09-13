import { describe, expect, test } from 'vitest'

import {
  createOrganisms,
  organismAData,
  organismBData,
} from './fixtures/organisms.js'

describe('compatibleDistance', () => {
  test('should hydrate genomes properly', () => {
    const [a, b] = createOrganisms()
    expect(a.toJSON()).toEqual(organismAData)
    expect(b.toJSON()).toEqual(organismBData)
  })
  test('should report correct distance', () => {
    const [a, b] = createOrganisms()
    expect(a.distance(b)).toBe(0.9070363358888259)
  })
})
