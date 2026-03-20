export interface RNG {
  gen: () => number
  genRange: (min: number, max: number) => number
  genBool: () => boolean
  derive: (label: string) => RNG
  toSeed: () => string
}

/**
 * Hash a string into a 32-bit unsigned integer using cyrb53 (truncated).
 * Based on https://stackoverflow.com/a/52171480
 */
const hashString = (str: string): number => {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return h2 >>> 0
}

/**
 * Mulberry32 PRNG. Returns a function that produces floats in [0, 1).
 * https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
const mulberry32 = (seed: number): (() => number) => {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

const createSeededRNG = (numericSeed: number): RNG => {
  const rng = mulberry32(numericSeed)
  return {
    gen: (): number => rng(),
    genRange: (min: number, max: number): number => {
      if (min >= max) {
        throw new Error('min must be less than max')
      }
      const range = max - min
      return Math.floor(rng() * range) + min
    },
    genBool: (): boolean => rng() < 0.5,
    derive: (label: string): RNG => {
      const childSeed = hashString(`${numericSeed}:${label}`)
      return createSeededRNG(childSeed)
    },
    toSeed: (): string => `__rng:${numericSeed}`,
  }
}

export const createRNG = (seed?: string): RNG => {
  let numericSeed: number
  if (seed != null && seed.startsWith('__rng:')) {
    numericSeed = Number.parseInt(seed.slice(6), 10) >>> 0
  } else if (seed != null) {
    numericSeed = hashString(seed)
  } else {
    try {
      const bytes = new Uint32Array(1)
      crypto.getRandomValues(bytes)
      numericSeed = bytes[0] ?? 0
    } catch {
      numericSeed = (Math.random() * 0x100000000) >>> 0
    }
  }
  return createSeededRNG(numericSeed)
}

let globalRNG: RNG = createRNG()

/** @deprecated Use `createRNG(seed)` and pass the RNG through context instead. */
export const setThreadRNGSeed = (seed: string) => {
  globalRNG = createRNG(seed)
  return globalRNG
}

/** @deprecated Use `createRNG()` and pass the RNG through context instead. */
export const resetThreadRNG = () => {
  globalRNG = createRNG()
  return globalRNG
}

/** @deprecated Use `context.rng` or derive from a root RNG instead. */
export const threadRNG = () => globalRNG
