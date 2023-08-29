import seedrandom from 'seedrandom'

// Fisher-Yates (aka Knuth) Shuffle.
// https://stackoverflow.com/a/2450976
export const shuffle = <T>(array: T[], seed?: string): T[] => {
  const rng = seed != null ? seedrandom(seed) : Math.random
  let currentIndex = array.length
  let randomIndex: number

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(rng() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    const temp = array[currentIndex] as T
    array[currentIndex] = array[randomIndex] as T
    array[randomIndex] = temp
  }

  return array
}
