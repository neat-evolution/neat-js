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
    await import(algorithmPathname)
  const { createEnvironment } = await import(createEnvironmentPathname)

  const environment = createEnvironment(environmentData)

  const { createExecutor } = await import(createExecutorPathname)

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
