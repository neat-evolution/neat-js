import type QuickLRU from 'quick-lru'
import type { CachedExecutorEntry } from './createCachedExecutorEntry.js'
import type { GenomeFactoryConfig } from './GenomeFactoryConfig.js'
import type { ThreadInfo } from './ThreadInfo.js'

export interface ThreadContext {
  threadInfo?: ThreadInfo
  genomeFactoryConfig?: GenomeFactoryConfig
  executorCache: QuickLRU<string, CachedExecutorEntry> | undefined
}
