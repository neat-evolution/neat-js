import type { WorkerContext } from '@neat-evolution/worker-actions'
import QuickLRU from 'quick-lru'

import type { InitGenomeFactoryPayload } from '../actions.js'

import type { ThreadContext } from './ThreadContext.js'

export type HandleInitGenomeFn = (
  payload: InitGenomeFactoryPayload,
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
  const maxSize = context.threadInfo.executorCacheMaxSize ?? 0
  context.executorCache = maxSize > 0 ? new QuickLRU({ maxSize }) : undefined

  if (context.dispatch == null) {
    throw new Error('dispatch not properly added to context')
  }
  // FIXME: should this just be handled by returning true?
}
