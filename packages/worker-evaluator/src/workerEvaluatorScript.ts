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
import type { ThreadContext } from './worker/ThreadContext.js'

const handler = new Handler()
const threadContext: ThreadContext & Partial<WorkerContext> = {}

function getThreadContext(): ThreadContext & WorkerContext {
  return threadContext as ThreadContext & WorkerContext
}

handler.register(ActionType.INIT_EVALUATOR, async (payload, context) => {
  for (const [key, value] of Object.entries(context)) {
    // @ts-expect-error - Dynamically copying context properties to threadContext
    threadContext[key] = value
  }
  await handleInitEvaluator(payload as InitPayload, getThreadContext())
})

handler.register(ActionType.INIT_GENOME_FACTORY, async (payload) => {
  await handleInitGenomeFactory(
    payload as InitGenomeFactoryPayload,
    getThreadContext()
  )
})

handler.register(ActionType.REQUEST_EVALUATE_GENOME, async (payload) => {
  return await handleEvaluateGenome(
    payload as EvaluateGenomePayload,
    getThreadContext()
  )
})

handler.register(ActionType.REQUEST_EVALUATE_BATCH, async (payload) => {
  return await handleEvaluateBatch(
    payload as EvaluateBatchPayload,
    getThreadContext()
  )
})

handler.register(ActionType.TERMINATE, async () => null)

handler.ready()
