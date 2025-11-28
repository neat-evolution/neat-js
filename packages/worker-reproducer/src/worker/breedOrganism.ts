import type { Organism } from '@neat-evolution/evolution'

import type { SpeciesPayload } from '../actions.js'

import { populationTournamentSelect } from './populationTournamentSelect.js'
import { speciesTournamentSelect } from './speciesTournamentSelect.js'
import type { ReproducerHandlerContext } from './ThreadContext.js'

export const breedOrganism = async (
  payload: SpeciesPayload,
  context: ReproducerHandlerContext
) => {
  if (context.threadInfo == null) {
    throw new Error('breedOrganism threadInfo not initialized')
  }
  const father =
    context.rng.gen() <
    context.threadInfo.populationOptions.interspeciesReproductionProbability
      ? await populationTournamentSelect(context) // Interspecies breeding
      : await speciesTournamentSelect(payload.speciesId, context) // Breeding within species

  if (father == null) {
    throw new Error('Unable to gather father organism')
  }

  let child: Organism<any, any, any, any, any, any, any>
  if (
    context.rng.gen() <
    context.threadInfo.populationOptions.asexualReproductionProbability
  ) {
    child = father.asElite()
  } else {
    const mother = await speciesTournamentSelect(payload.speciesId, context)
    if (mother == null) {
      throw new Error('Unable to gather mother organism')
    }
    child = mother.crossover(father)
  }

  await child.mutate()

  const responsePayload = {
    genome: child.genome.toFactoryOptions(),
    organismState: child.toFactoryOptions(),
  }

  // Return the payload directly - Handler will automatically send RPC response
  return responsePayload
}
