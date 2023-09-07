import seedrandom from 'seedrandom'

export interface RNG {
  gen: () => number
  genRange: (min: number, max: number) => number
}

export const createRNG = (seed?: string): RNG => {
  const rng = seedrandom(seed)
  return {
    gen: rng,
    genRange: (min: number, max: number): number => {
      if (min >= max) {
        throw new Error('min must be less than max')
      }
      const range = max - min
      return Math.floor(rng() * range) + min
    },
  }
}
