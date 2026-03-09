import QuickLRU from 'quick-lru'

export const innovationHashCache = new QuickLRU<number, number>({
  maxSize: 1000,
})

export type InnovationKey = number

const mix32 = (value: number): number => {
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b)
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35)
  value ^= value >>> 16
  return value >>> 0
}

export const hashInnovationKey = (innovationKey: InnovationKey): number => {
  const cached = innovationHashCache.get(innovationKey)
  if (cached !== undefined) {
    return cached
  }

  const low = innovationKey >>> 0
  const high = Math.floor(innovationKey / 0x100000000) >>> 0
  const hash = mix32(low ^ mix32(high ^ 0x9e3779b9))

  innovationHashCache.set(innovationKey, hash)
  return hash
}
