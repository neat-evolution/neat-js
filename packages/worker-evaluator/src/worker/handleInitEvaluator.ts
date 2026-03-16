import type { EnvironmentRuntimeOptions } from '@neat-evolution/execution-manager'
import { createWorkerStatsRecorder } from '@neat-evolution/stats'
import type { WorkerContext } from '@neat-evolution/worker-actions'
import type { InitPayload } from '../actions.js'
import { recordStats } from '../actions.js'

import type { ThreadContext } from './ThreadContext.js'

export type HandleInitEvaluatorFn = (
  payload: InitPayload,
  context: ThreadContext & Partial<WorkerContext>
) => Promise<undefined>

export const handleInitEvaluator: HandleInitEvaluatorFn = async (
  {
    algorithmPathname,
    createEnvironmentPathname,
    createExecutorPathname,
    environmentData,
    executorCacheMaxSize,
    statsConfig,
    hydrateEnvironmentOptions,
    environmentRuntimeData,
  },
  context
) => {
  const { createConfig, createGenome, createPhenotype, createState } =
    await import(/* @vite-ignore */ algorithmPathname)
  const { createEnvironment } = await import(
    /* @vite-ignore */ createEnvironmentPathname
  )
  const { createExecutor } = await import(
    /* @vite-ignore */ createExecutorPathname
  )

  // FIXME: should this just be handled by returning true?
  if (context.send == null) {
    throw new Error('send not properly added to context')
  }

  // Build runtime options for the environment
  const runtimeOptions: EnvironmentRuntimeOptions = {}

  // Create worker-side stats recorder that bridges to main thread
  if (statsConfig != null) {
    const send = context.send
    context.stats = createWorkerStatsRecorder(statsConfig, (metric, value) => {
      send(recordStats({ metric, value }))
    })
    runtimeOptions.stats = context.stats
  }

  // Merge serializable runtime data (factory options, config blobs)
  if (environmentRuntimeData != null) {
    Object.assign(runtimeOptions, environmentRuntimeData)
  }

  // Hydrate each pathname: dynamically import and inject into runtimeOptions
  if (hydrateEnvironmentOptions != null) {
    for (const [field, path] of Object.entries(hydrateEnvironmentOptions)) {
      const mod = await import(/* @vite-ignore */ path)
      runtimeOptions[field] = mod.default ?? mod[field]
    }
  }

  const environment = createEnvironment(environmentData, runtimeOptions)

  context.threadInfo = {
    createConfig,
    createExecutor,
    createGenome,
    createPhenotype,
    createState,
    environment,
    ...(executorCacheMaxSize != null ? { executorCacheMaxSize } : {}),
  }

  // Store base runtime options for per-genome merging in handleEvaluateGenome
  context.baseRuntimeOptions = runtimeOptions

  return undefined
}
