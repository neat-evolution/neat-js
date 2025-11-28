import { threadRNG } from '@neat-evolution/utils'
import { Handler, type WorkerContext } from '@neat-evolution/worker-actions'

import {
  ActionType,
  type InitReproducerPayload,
  type OrganismPayload,
  type SpeciesPayload,
} from './actions.js'
import { breedOrganism } from './worker/breedOrganism.js'
import { eliteOrganism } from './worker/eliteOrganism.js'
import { initThread } from './worker/initThread.js'
import { type ThreadContext } from './worker/ThreadContext.js'

const handler = new Handler()

// Minimal ThreadContext - only app-specific state
const threadContext: ThreadContext & Partial<WorkerContext> = {
  rng: threadRNG(),
  threadInfo: null,
}

handler.register(
  ActionType.INIT_REPRODUCER,
  async (payload: InitReproducerPayload<any, any>, context) => {
    // Copy WorkerContext properties once during init (like worker-evaluator)
    for (const [key, value] of Object.entries(context)) {
      ;(threadContext as any)[key] = value
    }
    await initThread(payload, threadContext as ThreadContext & WorkerContext)
  }
)

handler.register(
  ActionType.REQUEST_ELITE_ORGANISM,
  (payload: OrganismPayload<any>) => {
    return eliteOrganism(
      payload,
      threadContext as ThreadContext & WorkerContext
    )
  }
)

handler.register(
  ActionType.REQUEST_BREED_ORGANISM,
  async (payload: SpeciesPayload) => {
    return await breedOrganism(
      payload,
      threadContext as ThreadContext & WorkerContext
    )
  }
)

handler.register(ActionType.TERMINATE, () => {
  return null
})

handler.ready()
