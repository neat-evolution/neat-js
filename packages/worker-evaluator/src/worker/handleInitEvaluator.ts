import { workerContext } from '@neat-evolution/worker-threads'

import {
  ActionType,
  createWorkerAction,
  type InitPayload,
} from '../WorkerAction.js'

import type { ThreadContext } from './ThreadContext.js'

export type HandleInitEvaluatorFn = (
  payload: InitPayload,
  threadContext: ThreadContext
) => Promise<void>

export const handleInitEvaluator: HandleInitEvaluatorFn = async (
  {
    algorithmPathname,
    createEnvironmentPathname,
    createExecutorPathname,
    environmentData,
  },
  threadContext
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

  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }
  threadContext.threadInfo = {
    createConfig,
    createExecutor,
    createGenome,
    createPhenotype,
    createState,
    environment,
  }
  workerContext.postMessage(
    createWorkerAction(ActionType.INIT_EVALUATOR_SUCCESS, null)
  )
}
