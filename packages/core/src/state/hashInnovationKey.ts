import QuickLRU from 'quick-lru'

// Create a QuickLRU cache instance
export const innovationHashCache = new QuickLRU<string, string>({
  maxSize: 1000,
})

/** `${sourceKey}:${targetKey}` */
export type InnovationKey = string

const hashNodeKey = (key: string, hash: number = 0) => {
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash >>>= 0
  }
  return hash
}

export const hashInnovationKey = (innovationKey: InnovationKey): string => {
  const cachedHashString = innovationHashCache.get(innovationKey)

  if (cachedHashString !== undefined) {
    return cachedHashString
  }

  const [sourceKey, targetKey] = innovationKey.split(':') as [
    sourceKey: string,
    targetKey: string,
  ]
  let hash = hashNodeKey(sourceKey)
  hash = hashNodeKey(targetKey, hash)

  const hashString = hash.toString(36)

  // Store the computed hash in the cache
  innovationHashCache.set(innovationKey, hashString)

  return hashString
}
