import { type RNG } from './rand.js'

// Fisher-Yates (aka Knuth) Shuffle.
// https://stackoverflow.com/a/2450976
export const shuffle = <T>(array: T[], rng: RNG): T[] => {
  let currentIndex = array.length
  let randomIndex: number

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(rng.gen() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    const temp = array[currentIndex] as T
    array[currentIndex] = array[randomIndex] as T
    array[randomIndex] = temp
  }

  return array
}
