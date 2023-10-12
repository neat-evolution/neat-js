import seedrandom from 'seedrandom'

export interface RNG {
  gen: () => number
  genRange: (min: number, max: number) => number
  genBool: () => boolean
}

export const createRNG = (seed?: string): RNG => {
  const rng = seedrandom(seed)
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
  }
}

const globalRNG: RNG = createRNG()

/**
 * A crude port of the Rust rand crate's thread_rng function.
 * @returns {RNG} a random number generator seeded with the current thread id
 */
export const threadRNG = () => globalRNG
