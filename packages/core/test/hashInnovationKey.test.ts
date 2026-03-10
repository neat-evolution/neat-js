import { describe, expect, test } from 'vitest'

import {
  hashInnovationKey,
  splitInnovationNodeId,
} from '../src/state/hashInnovationKey.js'
import { NodeType, toNodeKey } from '../src/index.js'

describe('hashInnovationKey', () => {
  test('should generate consistent hash for the same input', () => {
    const innovationKey = 0x123456789abc
    const hash1 = hashInnovationKey(innovationKey)
    const hash2 = hashInnovationKey(innovationKey)

    expect(hash1).toBe(hash2)
    expect(typeof hash1).toBe('number')
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

describe('splitInnovationNodeId', () => {
  test('should generate a consistent node id for the same split link', () => {
    const from = toNodeKey(NodeType.Input, 1)
    const to = toNodeKey(NodeType.Output, 7)

    expect(splitInnovationNodeId(from, to)).toBe(splitInnovationNodeId(from, to))
  })

  test('should distinguish different split links', () => {
    const from = toNodeKey(NodeType.Input, 1)
    const toA = toNodeKey(NodeType.Output, 7)
    const toB = toNodeKey(NodeType.Output, 8)

    expect(splitInnovationNodeId(from, toA)).not.toBe(
      splitInnovationNodeId(from, toB)
    )
  })
})
