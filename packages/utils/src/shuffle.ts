import { type RNG } from './rand.js'

// Uses the Durstenfeld algorithm which is based on the Fisher–Yates algorithm.
// https://github.com/sindresorhus/array-shuffle/blob/main/index.js
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
