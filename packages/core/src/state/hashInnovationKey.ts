import type { NodeKey } from '../node/nodeRefToKey.js'

export type InnovationKey = number

const LOW32 = 0x100000000

const mix32 = (value: number): number => {
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b)
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35)
  value ^= value >>> 16
  return value >>> 0
}

export const hashInnovationKey = (innovationKey: InnovationKey): number => {
  const low = innovationKey >>> 0
  const high = (innovationKey / LOW32) >>> 0
  return mix32(low ^ mix32(high ^ 0x9e3779b9))
}

export const splitInnovationNodeId = (from: NodeKey, to: NodeKey): number => {
  const fromLow = from >>> 0
  const fromHigh = (from / LOW32) >>> 0
  const toLow = to >>> 0
  const toHigh = (to / LOW32) >>> 0

  return mix32(
    fromLow ^
      ((toLow << 7) | (toLow >>> 25)) ^
      Math.imul(fromHigh ^ 0x9e3779b9, 0x85ebca6b) ^
      Math.imul(toHigh ^ 0xc2b2ae35, 0x27d4eb2f)
  )
}
