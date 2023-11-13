import type { Organism } from '@neat-evolution/evolution'
import { workerContext } from '@neat-evolution/worker-threads'

import {
  ActionType,
  createAction,
  type SpeciesPayload,
} from '../WorkerAction.js'

import { populationTournamentSelect } from './populationTournamentSelect.js'
import { speciesTournamentSelect } from './speciesTournamentSelect.js'
import type { ThreadContext } from './ThreadContext.js'

export const breedOrganism = async (
  payload: SpeciesPayload,
  context: ThreadContext
) => {
  if (context.threadInfo == null) {
    throw new Error('threadInfo not initialized')
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

  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }

  workerContext.postMessage(
    createAction(ActionType.RESPOND_BREED_ORGANISM, {
      requestId: payload.requestId,
      genome: child.genome.toFactoryOptions(),
      organismState: child.toFactoryOptions(),
    })
  )
}
