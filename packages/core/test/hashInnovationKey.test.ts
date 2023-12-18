import { beforeEach, describe, expect, test } from 'vitest'

import {
  hashInnovationKey,
  innovationHashCache,
} from '../src/state/hashInnovationKey.js'

describe('hashInnovationKey', () => {
  // Optional: Reset any global state if necessary before each test
  beforeEach(() => {
    // Reset any needed state
    innovationHashCache.clear()
  })

  test('should generate consistent hash for the same input', () => {
    const innovationKey = 'I1:H2'
    const hash1 = hashInnovationKey(innovationKey)
    const hash2 = hashInnovationKey(innovationKey)
    expect(hash1).toBe(hash2)
    expect(hash1).toBe('1bo4y')
  })

  test('should generate different hashes for different inputs', () => {
    const hash1 = hashInnovationKey('I1:H2')
    const hash2 = hashInnovationKey('H3:O1')
    expect(hash1).not.toBe(hash2)
    expect(hash2).toBe('1b2st')
  })

  test('should generate hashes for hidden inputs', () => {
    const hash1 = hashInnovationKey('H1bo4y:1b2st')
    expect(hash1).toBe('1yuen5z')
  })
})
