import QuickLRU from 'quick-lru'

import {
  type OrganismPayload,
  requestSpeciesTournamentSelect,
} from '../actions.js'

import { hydrateOrganismPayload } from './hydrateOrganismPayload.js'
import { selectOrganism } from './selectOrganism.js'
import type { ReproducerHandlerContext } from './ThreadContext.js'

export const speciesTournamentSelect = async (
  speciesId: number,
  context: ReproducerHandlerContext
) => {
  if (context.threadInfo == null) {
    throw new Error('speciesTournamentSelect threadInfo not initialized')
  }

  const localSpecies = context.localSpeciesOrganisms?.get(speciesId)
  if (localSpecies != null && localSpecies.length > 0) {
    return selectOrganism(
      localSpecies,
      context.threadInfo.populationOptions.tournamentSize,
      context
    )
  }

  let cacheBySpecies = context.speciesSelectionCache
  if (cacheBySpecies == null) {
    cacheBySpecies = new QuickLRU({
      maxSize: 32,
    })
    context.speciesSelectionCache = cacheBySpecies
  }
  let cache = cacheBySpecies.get(speciesId)
  if (cache == null) {
    cache = []
    cacheBySpecies.set(speciesId, cache)
  }
  const cached = cache.pop()
  if (cached != null) {
    return hydrateOrganismPayload(cached, context)
  }

  const payload = await context.call<OrganismPayload>(
    requestSpeciesTournamentSelect({
      speciesId,
    })
  )
  return hydrateOrganismPayload(payload, context)
}
