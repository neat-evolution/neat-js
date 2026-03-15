import type { EnvironmentRuntimeOptions } from '@neat-evolution/environment'
import type { WorkerTrainingCapabilities } from '@neat-evolution/evaluation-strategy'
import type { StatsRecorder } from '@neat-evolution/stats'
import type { Handler } from '@neat-evolution/worker-actions'
import type QuickLRU from 'quick-lru'

import type { EvaluateGenomeResult } from '../actions.js'

import type { CachedExecutorEntry } from './createCachedExecutorEntry.js'
import type { GenomeFactoryConfig } from './GenomeFactoryConfig.js'
import type { ThreadInfo } from './ThreadInfo.js'

/** Callback installed by worker plugins to enhance genome evaluation.
 *  When present, handleEvaluateGenome delegates to this instead of
 *  the vanilla environment.evaluate() path. */
export type EvaluationEnhancer = (
  genomeOptions: import('@neat-evolution/core').GenomeFactoryOptions,
  context: ThreadContext,
  seed?: string
) => EvaluateGenomeResult | Promise<EvaluateGenomeResult>

export interface ThreadContext {
  threadInfo?: ThreadInfo
  genomeFactoryConfig?: GenomeFactoryConfig
  executorCache: QuickLRU<string, CachedExecutorEntry> | undefined
  /** Worker's Handler instance, available for plugin registration. */
  handler?: Handler
  /** Capabilities registered by worker plugins (reported back to main thread). */
  workerCapabilities?: WorkerTrainingCapabilities
  /** Opaque config blob from main thread, consumed by worker plugins during init. */
  pluginData?: Record<string, unknown>
  /** Evaluation enhancer installed by a worker plugin (e.g., RL training shim).
   *  When set, handleEvaluateGenome delegates evaluation to this callback. */
  evaluationEnhancer?: EvaluationEnhancer
  /** Stats recorder bridged to the main thread via fire-and-forget messages. */
  stats?: StatsRecorder
  /** Base runtime options built during init (factories + options).
   *  Merged with per-genome evaluationContext before each evaluation. */
  baseRuntimeOptions?: EnvironmentRuntimeOptions
}
