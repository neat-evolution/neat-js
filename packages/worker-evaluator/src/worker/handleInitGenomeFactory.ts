import type { WorkerContext } from '@neat-evolution/worker-actions'

import { type InitGenomeFactoryPayload } from '../actions.js'

import type { ThreadContext } from './ThreadContext.js'

export type HandleInitGenomeFn = (
  payload: InitGenomeFactoryPayload<any, any>,
  context: ThreadContext & Partial<WorkerContext>
) => Promise<void>

export const handleInitGenomeFactory: HandleInitGenomeFn = async (
  { configData, genomeOptions, initConfig },
  context
) => {
  if (context.threadInfo == null) {
    throw new Error('handleInitGenomeFactory threadInfo not initialized')
  }

  const configProvider = context.threadInfo.createConfig(configData)
  const stateProvider = context.threadInfo.createState()

  context.genomeFactoryConfig = {
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
  }

  if (context.dispatch == null) {
    throw new Error('dispatch not properly added to context')
  }
  // FIXME: should this just be handled by returning true?
}
