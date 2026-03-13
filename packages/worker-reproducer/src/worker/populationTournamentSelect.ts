import {
  type OrganismBatchPayload,
  type OrganismPayload,
  requestPopulationSnapshot,
  requestPopulationTournamentSelect,
} from '../actions.js'

import { hydrateOrganismPayload } from './hydrateOrganismPayload.js'
import { selectOrganism } from './selectOrganism.js'
import type { ReproducerHandlerContext } from './ThreadContext.js'

export const populationTournamentSelect = async (
  context: ReproducerHandlerContext
) => {
  if (context.threadInfo == null) {
    throw new Error('populationTournamentSelect threadInfo not initialized')
  }

  const localPopulation = context.localPopulationOrganisms
  if (localPopulation != null && localPopulation.length > 0) {
    return selectOrganism(
      localPopulation,
      context.threadInfo.populationOptions.interspeciesTournamentSize,
      context
    )
  }

  let cache = context.populationSelectionCache
  if (cache == null) {
    cache = []
    context.populationSelectionCache = cache
  }
  const cached = cache.pop()
  if (cached != null) {
    return hydrateOrganismPayload(cached, context)
  }

  if (context.allowLazyPopulationSnapshot) {
    const snapshot = await context.call<OrganismBatchPayload>(
      requestPopulationSnapshot({})
    )
    const hydrated = snapshot.organisms.map((payload) =>
      hydrateOrganismPayload(payload, context)
    )
    context.localPopulationOrganisms = hydrated
    return selectOrganism(
      hydrated,
      context.threadInfo.populationOptions.interspeciesTournamentSize,
      context
    )
  }

  const payload = await context.call<OrganismPayload>(
    requestPopulationTournamentSelect({})
  )
  return hydrateOrganismPayload(payload, context)
}
