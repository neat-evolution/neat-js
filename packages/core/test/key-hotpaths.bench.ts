import { bench, describe } from 'vitest'

import { NodeType, toNodeKey } from '../src/index.js'
import { toLinkKey } from '../src/link/linkRefToKey.js'
import {
  hashInnovationKey,
  splitInnovationNodeId,
} from '../src/state/hashInnovationKey.js'

const LOW32 = 0x100000000
const HIGH53_MASK = 0x1fffff

const rotl32 = (value: number, shift: number): number => {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0
}

const mix32 = (value: number): number => {
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b)
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35)
  value ^= value >>> 16
  return value >>> 0
}

const CURRENT_DATASET_SIZE = 16_384
const REPEATED_DATASET_SIZE = 512

const buildNodeKeys = (count: number) => {
  const sourceKeys: number[] = new Array(count)
  const targetKeys: number[] = new Array(count)

  for (let i = 0; i < count; i++) {
    const sourceType =
      i % 3 === 0
        ? NodeType.Input
        : i % 3 === 1
          ? NodeType.Hidden
          : NodeType.Output
    const targetType = i % 2 === 0 ? NodeType.Hidden : NodeType.Output

    sourceKeys[i] = toNodeKey(sourceType, i)
    targetKeys[i] = toNodeKey(targetType, (i * 17 + 13) >>> 0)
  }

  return { sourceKeys, targetKeys }
}

const currentToLinkKeyNoCache = (from: number, to: number): number => {
  const fromLow = from >>> 0
  const fromHigh = Math.floor(from / LOW32) >>> 0
  const toLow = to >>> 0
  const toHigh = Math.floor(to / LOW32) >>> 0

  const laneA = mix32(
    fromLow ^
      rotl32(toLow, 13) ^
      Math.imul(fromHigh ^ 0x9e3779b9, 0x85ebca6b) ^
      Math.imul(toHigh ^ 0x7f4a7c15, 0xc2b2ae35)
  )
  const laneB = mix32(
    toLow ^
      rotl32(fromLow, 11) ^
      Math.imul(toHigh ^ 0x165667b1, 0x27d4eb2f) ^
      Math.imul(fromHigh ^ 0xd3a2646c, 0x9e3779b1)
  )

  return (laneA & HIGH53_MASK) * LOW32 + laneB
}

const cheaperToLinkKeyCandidate = (from: number, to: number): number => {
  const fromLow = from >>> 0
  const fromHigh = (from / LOW32) >>> 0
  const toLow = to >>> 0
  const toHigh = (to / LOW32) >>> 0

  const laneA = mix32(
    fromLow ^ Math.imul(toLow ^ 0x9e3779b9, 0x85ebca6b) ^ (fromHigh << 1) ^ toHigh
  )
  const laneB = mix32(
    toLow ^ Math.imul(fromLow ^ 0xc2b2ae35, 0x27d4eb2f) ^ fromHigh ^ (toHigh << 1)
  )

  return (laneA & HIGH53_MASK) * LOW32 + laneB
}

const hashInnovationKeyNoCache = (innovationKey: number): number => {
  const low = innovationKey >>> 0
  const high = Math.floor(innovationKey / LOW32) >>> 0
  return mix32(low ^ mix32(high ^ 0x9e3779b9))
}

const directSplitNodeIdCandidate = (from: number, to: number): number => {
  const fromLow = from >>> 0
  const fromHigh = (from / LOW32) >>> 0
  const toLow = to >>> 0
  const toHigh = (to / LOW32) >>> 0

  return mix32(
    fromLow ^
      rotl32(toLow, 7) ^
      Math.imul(fromHigh ^ 0x9e3779b9, 0x85ebca6b) ^
      Math.imul(toHigh ^ 0xc2b2ae35, 0x27d4eb2f)
  )
}

describe('Key Hot Path Benchmark', () => {
  const currentData = buildNodeKeys(CURRENT_DATASET_SIZE)
  const repeatedData = buildNodeKeys(REPEATED_DATASET_SIZE)

  const currentInnovationKeys = currentData.sourceKeys.map((from, index) =>
    toLinkKey(from, currentData.targetKeys[index] as number)
  )
  const repeatedInnovationKeys = repeatedData.sourceKeys.map((from, index) =>
    toLinkKey(from, repeatedData.targetKeys[index] as number)
  )

  bench(
    'toLinkKey current implementation unique pairs',
    () => {
      let acc = 0
      for (let i = 0; i < currentData.sourceKeys.length; i++) {
        acc ^= toLinkKey(
          currentData.sourceKeys[i] as number,
          currentData.targetKeys[i] as number
        )
      }
      return acc
    },
    { iterations: 200 }
  )

  bench(
    'toLinkKey current implementation inlined unique pairs',
    () => {
      let acc = 0
      for (let i = 0; i < currentData.sourceKeys.length; i++) {
        acc ^= currentToLinkKeyNoCache(
          currentData.sourceKeys[i] as number,
          currentData.targetKeys[i] as number
        )
      }
      return acc
    },
    { iterations: 200 }
  )

  bench(
    'toLinkKey cheaper candidate unique pairs',
    () => {
      let acc = 0
      for (let i = 0; i < currentData.sourceKeys.length; i++) {
        acc ^= cheaperToLinkKeyCandidate(
          currentData.sourceKeys[i] as number,
          currentData.targetKeys[i] as number
        )
      }
      return acc
    },
    { iterations: 200 }
  )

  bench(
    'hashInnovationKey repeated keys',
    () => {
      let acc = 0
      for (let loop = 0; loop < 32; loop++) {
        for (let i = 0; i < repeatedInnovationKeys.length; i++) {
          acc ^= hashInnovationKey(repeatedInnovationKeys[i] as number)
        }
      }
      return acc
    },
    { iterations: 200 }
  )

  bench(
    'hashInnovationKey unique keys',
    () => {
      let acc = 0
      for (let i = 0; i < currentInnovationKeys.length; i++) {
        acc ^= hashInnovationKey(currentInnovationKeys[i] as number)
      }
      return acc
    },
    { iterations: 200 }
  )

  bench(
    'hashInnovationKey no cache unique keys',
    () => {
      let acc = 0
      for (let i = 0; i < currentInnovationKeys.length; i++) {
        acc ^= hashInnovationKeyNoCache(currentInnovationKeys[i] as number)
      }
      return acc
    },
    { iterations: 200 }
  )

  bench(
    'split innovation current flow unique pairs',
    () => {
      let acc = 0
      for (let i = 0; i < currentData.sourceKeys.length; i++) {
        const innovationKey = toLinkKey(
          currentData.sourceKeys[i] as number,
          currentData.targetKeys[i] as number
        )
        acc ^= hashInnovationKey(innovationKey)
      }
      return acc
    },
    { iterations: 200 }
  )

  bench(
    'split innovation direct path unique pairs',
    () => {
      let acc = 0
      for (let i = 0; i < currentData.sourceKeys.length; i++) {
        acc ^= splitInnovationNodeId(
          currentData.sourceKeys[i] as number,
          currentData.targetKeys[i] as number
        )
      }
      return acc
    },
    { iterations: 200 }
  )

  bench(
    'split innovation direct candidate unique pairs',
    () => {
      let acc = 0
      for (let i = 0; i < currentData.sourceKeys.length; i++) {
        acc ^= directSplitNodeIdCandidate(
          currentData.sourceKeys[i] as number,
          currentData.targetKeys[i] as number
        )
      }
      return acc
    },
    { iterations: 200 }
  )
})
