import { workerContext } from '@neat-evolution/worker-threads'

import {
  ActionType,
  createWorkerAction,
  type InitGenomeFactoryPayload,
} from '../WorkerAction.js'

import type { ThreadContext } from './ThreadContext.js'

export type HandleInitGenomeFn = (
  payload: InitGenomeFactoryPayload<any, any>,
  threadContext: ThreadContext
) => Promise<void>

export const handleInitGenomeFactory: HandleInitGenomeFn = async (
  { configData, genomeOptions, initConfig },
  threadContext
) => {
  if (threadContext.threadInfo == null) {
    throw new Error('threadInfo not initialized')
  }
  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }

  const configProvider = threadContext.threadInfo.createConfig(configData)
  const stateProvider = threadContext.threadInfo.createState()

  threadContext.genomeFactoryConfig = {
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
  }
  workerContext.postMessage(
    createWorkerAction(ActionType.INIT_GENOME_FACTORY_SUCCESS, null)
  )
}
