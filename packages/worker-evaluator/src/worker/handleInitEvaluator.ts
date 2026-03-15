import type { EnvironmentRuntimeOptions } from '@neat-evolution/environment'
import type { WorkerTrainingCapabilities } from '@neat-evolution/evaluation-strategy'
import { createWorkerStatsRecorder } from '@neat-evolution/stats'
import type { WorkerContext } from '@neat-evolution/worker-actions'
import type { InitPayload } from '../actions.js'
import { recordStats } from '../actions.js'

import type { ThreadContext } from './ThreadContext.js'

export type HandleInitEvaluatorFn = (
  payload: InitPayload,
  context: ThreadContext & Partial<WorkerContext>
) => Promise<WorkerTrainingCapabilities | undefined>

export const handleInitEvaluator: HandleInitEvaluatorFn = async (
  {
    algorithmPathname,
    createEnvironmentPathname,
    createExecutorPathname,
    environmentData,
    executorCacheMaxSize,
    pluginPaths,
    pluginData,
    statsConfig,
    hydrateEnvironmentOptions,
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

  // Store plugin data for worker plugins to consume during init
  if (pluginData != null) {
    context.pluginData = pluginData
  }

  // Load strategy plugins
  if (pluginPaths) {
    for (const pluginPath of pluginPaths) {
      const pluginModule = await import(/* @vite-ignore */ pluginPath)
      const pluginInit = pluginModule.default ?? pluginModule.init
      if (typeof pluginInit === 'function') {
        await pluginInit(context.handler, context)
      }
    }
  }

  return context.workerCapabilities
}
