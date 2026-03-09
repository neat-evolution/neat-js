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
  const threadInfo = context.threadInfo
  const father =
    context.rng.gen() <
    threadInfo.populationOptions.interspeciesReproductionProbability
      ? await populationTournamentSelect(context)
      : await speciesTournamentSelect(payload.speciesId, context)

  if (father == null) {
    throw new Error('Unable to gather father organism')
  }

  let child: Organism
  if (
    context.rng.gen() <
    threadInfo.populationOptions.asexualReproductionProbability
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
