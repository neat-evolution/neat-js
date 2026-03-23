import type { Organism } from '@neat-evolution/evolution'
import { createRNG } from '@neat-evolution/utils'

import type { BreedOrganismPayload } from '../actions.js'

import { populationTournamentSelect } from './populationTournamentSelect.js'
import { speciesTournamentSelect } from './speciesTournamentSelect.js'
import type { ReproducerHandlerContext } from './ThreadContext.js'

export const breedOrganism = async (
  payload: BreedOrganismPayload,
  context: ReproducerHandlerContext
) => {
  if (context.threadInfo == null) {
    throw new Error('breedOrganism threadInfo not initialized')
  }
  const threadInfo = context.threadInfo

  // Scope context.rng to this request — same pattern as reproduceBatch.
  const previousRng = context.rng
  const rng = createRNG(payload.rngSeed)
  context.rng = rng.derive('selection')

  try {
    const father =
      rng.gen() <
      threadInfo.populationOptions.interspeciesReproductionProbability
        ? await populationTournamentSelect(context)
        : await speciesTournamentSelect(payload.speciesId, context)

    if (father == null) {
      throw new Error('Unable to gather father organism')
    }

    let child: Organism
    if (
      rng.gen() < threadInfo.populationOptions.asexualReproductionProbability
    ) {
      child = father.asElite()
    } else {
      const mother = await speciesTournamentSelect(payload.speciesId, context)
      if (mother == null) {
        throw new Error('Unable to gather mother organism')
      }
      child = mother.crossover(father, rng)
    }

    await child.mutate(rng.derive('mutation'))

    return {
      genome: child.genome.toFactoryOptions(),
      organismState: child.toFactoryOptions(),
    }
  } finally {
    context.rng = previousRng
  }
}
