import type { WorkerContext } from '@neat-evolution/worker-actions'

import { type InitPayload } from '../actions.js'

import type { ThreadContext } from './ThreadContext.js'

export type HandleInitEvaluatorFn = (
  payload: InitPayload,
  context: ThreadContext & Partial<WorkerContext>
) => Promise<void>

export const handleInitEvaluator: HandleInitEvaluatorFn = async (
  {
    algorithmPathname,
    createEnvironmentPathname,
    createExecutorPathname,
    environmentData,
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
  const environment = createEnvironment(environmentData)

  context.threadInfo = {
    createConfig,
    createExecutor,
    createGenome,
    createPhenotype,
    createState,
    environment,
  }
  // FIXME: should this just be handled by returning true?
  if (context.dispatch == null) {
    throw new Error('dispatch not properly added to context')
  }
}
