/**
 * Per-factor binary sampling from 2-way softmax pairs.
 *
 * Given 2N probabilities (N pairs of [P_on, P_off]), samples one binary
 * value per factor. Returns an N-length array of 0s and 1s.
 *
 * @param probabilities - Softmax outputs, length 2N (pairs of [P_on, P_off])
 * @param factorCount - Number of binary factors (N)
 * @param rng - Random number generator returning [0, 1)
 * @returns N-length Float64Array of binary values (0 or 1)
 */
export function sampleActionMultiDiscrete(
  probabilities: Float64Array,
  factorCount: number,
  rng: () => number
): Float64Array {
  const action = new Float64Array(factorCount)
  for (let b = 0; b < factorCount; b++) {
    const pOn = probabilities[2 * b] as number
    // Sample: if random < pOn, choose "on" (1), else "off" (0)
    action[b] = rng() < pOn ? 1 : 0
  }
  return action
}
