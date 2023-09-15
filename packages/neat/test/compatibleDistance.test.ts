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
  test('should report correct distance (example 1)', () => {
    const [a, b] = createOrganisms()
    expect(a.distance(b)).toBe(0.9070363358888259)
  })

  test('should report correct distance (example 2)', () => {
    const [a, b] = createOrganisms(1)
    // FIXME: why is this different? 0.9654000889413255
    expect(a.distance(b)).toBe(0.9904314802185428)
  })
})
