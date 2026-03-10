import type { GenomeFactoryConfig } from './GenomeFactoryConfig.js'
import type { ThreadInfo } from './ThreadInfo.js'
import type { CachedExecutorEntry } from './createCachedExecutorEntry.js'
import type QuickLRU from 'quick-lru'

export interface ThreadContext {
  threadInfo?: ThreadInfo
  genomeFactoryConfig?: GenomeFactoryConfig
  executorCache: QuickLRU<string, CachedExecutorEntry> | undefined
}
