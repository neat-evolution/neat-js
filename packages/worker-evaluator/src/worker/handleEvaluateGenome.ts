import { createRNG } from '@neat-evolution/utils'
import type { WorkerContext } from '@neat-evolution/worker-actions'

import type { EvaluateGenomePayload, EvaluateGenomeResult } from '../actions.js'

import { createBoundContext } from './createBoundContext.js'
import { createCachedExecutorEntry } from './createCachedExecutorEntry.js'
import type { ThreadContext } from './ThreadContext.js'

export type HandleEvaluateGenomeFn = (
  options: EvaluateGenomePayload,
  context: ThreadContext & Partial<WorkerContext>
) => Promise<EvaluateGenomeResult>

export const handleEvaluateGenome: HandleEvaluateGenomeFn = async (
  options,
  context
) => {
  const { genomeOptions: genomeFactoryOptions, seed } = options
  if (context.threadInfo == null) {
    throw new Error('handleEvaluateGenome threadInfo not initialized')
  }
  if (context.genomeFactoryConfig == null) {
    throw new Error('genomeFactoryConfig not initialized')
  }

  // Clear pending writeback/telemetry from previous evaluation
  context.pendingWriteback = undefined
  context.pendingTelemetry = undefined

  // If a worker plugin installed an evaluation enhancer (e.g., RL training),
  // delegate to it instead of the vanilla evaluation path.
  if (context.evaluationEnhancer != null) {
    const result = await context.evaluationEnhancer(
      genomeFactoryOptions,
      context,
      seed
    )
    if (context.pendingWriteback != null) {
      result.updatedActions ??= context.pendingWriteback
    }
    if (context.pendingTelemetry != null) {
      result.telemetry ??= context.pendingTelemetry
    }
    return result
  }

  const rng = seed != null ? createRNG(seed) : undefined
  const { environment } = context.threadInfo

  // Create a bound context for this evaluation
  const boundContext = createBoundContext({
    send: context.send,
    call: context.call,
    stats: context.stats,
  })

  const { executor } = createCachedExecutorEntry(
    genomeFactoryOptions,
    context,
    { cache: false }
  )

  // Register executor in the bound context for writeback correlation
  boundContext.executorMap.set(executor, 0)

  // evaluate the genome
  let fitness: number

  // allow for different types of environments
  if (environment.isAsync) {
    fitness = await environment.evaluateAsync(executor, rng)
  } else {
    fitness = environment.evaluate(executor, rng)
  }

  // Flush writebacks and fire onFitness callbacks
  const writebacks = boundContext.flush()
  boundContext.fireFitnessCallbacks(fitness)

  const result: EvaluateGenomeResult = { fitness }

  // Extract writeback for this executor (index 0)
  if (writebacks != null) {
    const updatedActions = writebacks.get(0)
    if (updatedActions != null) {
      result.updatedActions = updatedActions
    }
  }

  // Preserve existing pendingWriteback/pendingTelemetry path (Part 04 removes)
  if (context.pendingWriteback != null) {
    result.updatedActions ??= context.pendingWriteback
  }
  if (context.pendingTelemetry != null) {
    result.telemetry = context.pendingTelemetry
  }
  return result
}
