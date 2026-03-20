import type { Organism } from '@neat-evolution/evolution'
import { createRNG } from '@neat-evolution/utils'

import type { OrganismBatchPayload, ReproduceBatchPayload } from '../actions.js'
import { hydrateOrganismPayload } from './hydrateOrganismPayload.js'
import { populationTournamentSelect } from './populationTournamentSelect.js'
import { speciesTournamentSelect } from './speciesTournamentSelect.js'
import type { ReproducerHandlerContext } from './ThreadContext.js'

function toPayload(organism: Organism) {
  return {
    genome: organism.genome.toFactoryOptions(),
    organismState: organism.toFactoryOptions(),
  }
}

export const reproduceBatch = async (
  payload: ReproduceBatchPayload,
  context: ReproducerHandlerContext
): Promise<OrganismBatchPayload> => {
  if (context.threadInfo == null) {
    throw new Error('reproduceBatch threadInfo not initialized')
  }

  const previousSpecies = context.localSpeciesOrganisms
  const previousPopulation = context.localPopulationOrganisms
  const previousAllowLazyPopulationSnapshot =
    context.allowLazyPopulationSnapshot

  const localSpecies = new Map<number, Array<Organism>>()
  for (const speciesEntry of payload.species) {
    localSpecies.set(
      speciesEntry.speciesId,
      speciesEntry.organisms.map((organismPayload) =>
        hydrateOrganismPayload(organismPayload, context)
      )
    )
  }

  context.localSpeciesOrganisms = localSpecies
  context.localPopulationOrganisms = undefined
  context.allowLazyPopulationSnapshot =
    context.threadInfo.populationOptions.interspeciesReproductionProbability > 0

  try {
    // Use per-batch RNG derived on the main thread — deterministic
    // regardless of which worker processes this batch.
    const batchRng = createRNG(payload.rngSeed)
    const organisms: OrganismBatchPayload['organisms'] = []
    for (const speciesEntry of payload.species) {
      for (let i = 0; i < speciesEntry.reproductions; i++) {
        const father =
          batchRng.gen() <
          context.threadInfo.populationOptions
            .interspeciesReproductionProbability
            ? await populationTournamentSelect(context)
            : await speciesTournamentSelect(speciesEntry.speciesId, context)

        if (father == null) {
          throw new Error('Unable to gather father organism')
        }

        let child: Organism
        if (
          batchRng.gen() <
          context.threadInfo.populationOptions.asexualReproductionProbability
        ) {
          child = father.asElite()
        } else {
          const mother = await speciesTournamentSelect(
            speciesEntry.speciesId,
            context
          )
          if (mother == null) {
            throw new Error('Unable to gather mother organism')
          }
          child = mother.crossover(father, batchRng)
        }

        await child.mutate(batchRng.derive(`mutation:${i}`))
        organisms.push(toPayload(child))
      }
    }

    return { organisms }
  } finally {
    context.localSpeciesOrganisms = previousSpecies
    context.localPopulationOrganisms = previousPopulation
    context.allowLazyPopulationSnapshot = previousAllowLazyPopulationSnapshot
  }
}
