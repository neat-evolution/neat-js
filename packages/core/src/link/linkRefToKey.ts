import type { NodeRef } from '../node/NodeRef.js'
import { type NodeKey, nodeRefToKey } from '../node/nodeRefToKey.js'

import type { LinkRef } from './LinkRef.js'

export type LinkKey = number
export type LinkNodeKey = NodeKey

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

export const linkRefToKey = (linkRef: LinkRef): LinkKey => {
  return toLinkKey(linkRef.from, linkRef.to)
}

export const nodeRefsToLinkKey = (from: NodeRef, to: NodeRef): LinkKey => {
  return toLinkKey(nodeRefToKey(from), nodeRefToKey(to))
}

export const toLinkKey = (from: LinkNodeKey, to: LinkNodeKey): LinkKey => {
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
