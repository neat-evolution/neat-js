import { type RNG } from './rand.js'

/**
 * Uses the Durstenfeld algorithm which is based on the Fisher–Yates algorithm.
 * This modifies the array in place.
 * @see https://github.com/sindresorhus/array-shuffle/blob/main/index.js
 * @see https://github.com/tenstad/des-hyperneat/blob/431d3bf99789111dd8093cae7c26bdfb9930f9f0/evolution/src/neat/genome.rs#L519
 * @see https://github.com/tenstad/des-hyperneat/blob/431d3bf99789111dd8093cae7c26bdfb9930f9f0/data/src/dataset.rs#L93-L94
 * @param {T[]} array array to shuffle in place
 * @param {RNG} rng a random number generator
 * @returns {T[]} the shuffled array
 */
export const shuffle = <T>(array: T[], rng: RNG): T[] => {
  if (array.length === 0) {
    return array
  }
  for (let index = array.length - 1; index > 0; index--) {
    const newIndex = Math.floor(rng.gen() * (index + 1))
    if (index === newIndex) {
      continue
    }
    const tmp = array[index] as T
    array[index] = array[newIndex] as T
    array[newIndex] = tmp
  }
  return array
}
