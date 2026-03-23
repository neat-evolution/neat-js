import { uniformInt } from 'pure-rand/distribution/uniformInt'
import { xoroshiro128plus } from 'pure-rand/generator/xoroshiro128plus'

export interface RNG {
  /** Uniform float in [0, 1). */
  gen: () => number
  /** Uniform integer in [min, max) — no modulo bias. */
  genIntRange: (min: number, max: number) => number
  /** Uniform boolean (50/50). */
  genBool: () => boolean
  /** Standard normal (Gaussian) variate via Box-Muller. */
  genGaussian: () => number
  /** Deterministic child RNG from a string label. Does not advance parent. */
  derive: (label: string) => RNG
  /** Fast-path child RNG from an integer id. Does not advance parent. */
  deriveInt: (id: number) => RNG
  /** Serialize seed for worker transport. */
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
 * Fast integer hash for deriveInt — avoids string allocation and parsing.
 */
const hashInt = (seed: number, id: number): number => {
  let hash = (seed ^ id) | 0
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad)
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97)
  return (hash ^ (hash >>> 15)) >>> 0
}

const createSeededRNG = (numericSeed: number): RNG => {
  // xoroshiro128plus: 128-bit state, period 2^128-1 — safe for heavy ML workloads.
  const generator = xoroshiro128plus(numericSeed)

  return {
    gen: (): number => {
      // uniformInt mutates generator in place; range is [from, to] inclusive.
      return uniformInt(generator, 0, 0x7fffffff) / 0x80000000
    },

    genIntRange: (min: number, max: number): number => {
      if (min >= max) {
        throw new Error('min must be less than max')
      }
      // pure-rand uses rejection sampling — no modulo bias.
      // Its range is [min, max] inclusive, so subtract 1 for [min, max) semantics.
      return uniformInt(generator, min, max - 1)
    },

    genBool: (): boolean => uniformInt(generator, 0, 1) === 1,

    genGaussian: (): number => {
      // Box-Muller transform: two uniform draws → one standard normal variate.
      // u1 starts at 1 (not 0) to avoid log(0).
      const u1 = uniformInt(generator, 1, 0x7fffffff) / 0x80000000
      const u2 = uniformInt(generator, 0, 0x7fffffff) / 0x80000000
      return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
    },

    derive: (label: string): RNG => {
      const childSeed = hashString(`${numericSeed}:${label}`)
      return createSeededRNG(childSeed)
    },

    deriveInt: (id: number): RNG => {
      return createSeededRNG(hashInt(numericSeed, id))
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
