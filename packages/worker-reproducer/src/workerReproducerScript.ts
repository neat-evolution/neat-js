import { threadRNG } from '@neat-evolution/utils'
import { Handler, type WorkerContext } from '@neat-evolution/worker-actions'
import QuickLRU from 'quick-lru'

import {
  ActionType,
  type InitReproducerPayload,
  type OrganismPayload,
  type ReproduceBatchPayload,
  type SpeciesPayload,
} from './actions.js'
import { breedOrganism } from './worker/breedOrganism.js'
import { eliteOrganism } from './worker/eliteOrganism.js'
import { initThread } from './worker/initThread.js'
import { reproduceBatch } from './worker/reproduceBatch.js'
import type { ThreadContext } from './worker/ThreadContext.js'

const handler = new Handler()

// Minimal ThreadContext - only app-specific state
const threadContext: ThreadContext & Partial<WorkerContext> = {
  rng: threadRNG(),
  threadInfo: null,
  speciesSelectionCache: new QuickLRU({ maxSize: 32 }),
  populationSelectionCache: [],
  localSpeciesOrganisms: undefined,
  localPopulationOrganisms: undefined,
  allowLazyPopulationSnapshot: false,
}

function getThreadContext(): ThreadContext & WorkerContext {
  return threadContext as ThreadContext & WorkerContext
}

handler.register(ActionType.INIT_REPRODUCER, async (payload, context) => {
  // Copy WorkerContext properties once during init (like worker-evaluator)
  Object.assign(threadContext, context)
  await initThread(payload as InitReproducerPayload, getThreadContext())
})

handler.register(ActionType.REQUEST_ELITE_ORGANISM, (payload) => {
  return eliteOrganism(payload as OrganismPayload, getThreadContext())
})

handler.register(ActionType.REQUEST_BREED_ORGANISM, async (payload) => {
  return await breedOrganism(payload as SpeciesPayload, getThreadContext())
})

handler.register(ActionType.REQUEST_REPRODUCE_BATCH, async (payload) => {
  return await reproduceBatch(
    payload as ReproduceBatchPayload,
    getThreadContext()
  )
})

handler.register(ActionType.TERMINATE, () => null)

handler.ready()
