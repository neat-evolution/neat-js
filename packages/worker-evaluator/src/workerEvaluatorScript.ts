import { Handler, type WorkerContext } from '@neat-evolution/worker-actions'

import {
  ActionType,
  type EvaluateBatchPayload,
  type EvaluateGenomePayload,
  type InitGenomeFactoryPayload,
  type InitPayload,
} from './actions.js'
import { handleEvaluateBatch } from './worker/handleEvaluateBatch.js'
import { handleEvaluateGenome } from './worker/handleEvaluateGenome.js'
import { handleInitEvaluator } from './worker/handleInitEvaluator.js'
import { handleInitGenomeFactory } from './worker/handleInitGenomeFactory.js'
import { type ThreadContext } from './worker/ThreadContext.js'

const handler = new Handler()
const threadContext: ThreadContext & Partial<WorkerContext> = {}

handler.register(
  ActionType.INIT_EVALUATOR,
  async (payload: InitPayload, context) => {
    for (const [key, value] of Object.entries(context)) {
      // @ts-expect-error - Dynamically copying context properties to threadContext
      threadContext[key] = value
    }
    await handleInitEvaluator(payload, threadContext)
  }
)

handler.register(
  ActionType.INIT_GENOME_FACTORY,
  async (payload: InitGenomeFactoryPayload<any, any>) => {
    await handleInitGenomeFactory(payload, threadContext)
  }
)

handler.register(
  ActionType.REQUEST_EVALUATE_GENOME,
  async (payload: EvaluateGenomePayload) => {
    return await handleEvaluateGenome(payload, threadContext)
  }
)

handler.register(
  ActionType.REQUEST_EVALUATE_BATCH,
  async (payload: EvaluateBatchPayload) => {
    return await handleEvaluateBatch(payload, threadContext)
  }
)

handler.register(ActionType.TERMINATE, async () => {
  return null
})

handler.ready()
