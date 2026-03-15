import type { EnvironmentRuntimeOptions } from '@neat-evolution/environment'
import type { StatsRecorder } from '@neat-evolution/stats'
import type { Handler } from '@neat-evolution/worker-actions'
import type QuickLRU from 'quick-lru'

import type { GenomeFactoryConfig } from './GenomeFactoryConfig.js'
import type { ThreadInfo } from './ThreadInfo.js'

import type { CachedExecutorEntry } from './createCachedExecutorEntry.js'

export interface ThreadContext {
  threadInfo?: ThreadInfo
  genomeFactoryConfig?: GenomeFactoryConfig
  executorCache: QuickLRU<string, CachedExecutorEntry> | undefined
  /** Worker's Handler instance, available for plugin registration. */
  handler?: Handler
  /** Stats recorder bridged to the main thread via fire-and-forget messages. */
  stats?: StatsRecorder
  /** Base runtime options built during init (factories + options).
   *  Merged with per-genome evaluationContext before each evaluation. */
  baseRuntimeOptions?: EnvironmentRuntimeOptions
}
