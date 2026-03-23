import type { Organism } from '@neat-evolution/evolution'

import type { ReproducerHandlerContext } from './ThreadContext.js'

export const selectOrganism = (
  organisms: Array<Organism>,
  k: number,
  context: ReproducerHandlerContext
): Organism | null => {
  const { rng } = context
  let best: Organism | null = null
  let bestFitness: number | null = null
  const safeK = Math.max(1, Math.trunc(k))

  for (let i = 0; i < safeK; i++) {
    if (organisms.length === 0) break
    const index = rng.genIntRange(0, organisms.length)
    const candidate = organisms[index] ?? null
    if (candidate == null) continue
    const candidateFitness = candidate.fitness ?? null
    if (
      best == null ||
      candidateFitness == null ||
      bestFitness == null ||
      candidateFitness > bestFitness
    ) {
      best = candidate
      bestFitness = candidateFitness
    }
  }

  return best
}
