import { beforeEach, describe, expect, test } from 'vitest'

import {
  hashInnovationKey,
  innovationHashCache,
} from '../src/state/hashInnovationKey.js'

describe('hashInnovationKey', () => {
  beforeEach(() => {
    innovationHashCache.clear()
  })

  test('should generate consistent hash for the same input', () => {
    const innovationKey = 0x123456789abc
    const hash1 = hashInnovationKey(innovationKey)
    const hash2 = hashInnovationKey(innovationKey)

    expect(hash1).toBe(hash2)
    expect(typeof hash1).toBe('number')
    expect(innovationHashCache.get(innovationKey)).toBe(hash1)
  })

  test('should generate different hashes for different inputs', () => {
    const hash1 = hashInnovationKey(0x123456789abc)
    const hash2 = hashInnovationKey(0xfedcba98765)

    expect(hash1).not.toBe(hash2)
  })

  test('should incorporate both high and low bits of the innovation key', () => {
    const lowOnly = hashInnovationKey(0x000000001234)
    const highOnly = hashInnovationKey(0x123400000000)

    expect(lowOnly).not.toBe(highOnly)
  })
})
