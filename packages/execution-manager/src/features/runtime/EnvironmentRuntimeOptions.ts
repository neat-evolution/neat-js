import type { StatsRecorder } from '@neat-evolution/stats'
import type { RNG } from '@neat-evolution/utils'
import type { AgentFactory } from '../agent/AgentFactory.js'
import type { TrainerFactory } from '../trainer/TrainerFactory.js'
import type { WorkerEvaluationContext } from './WorkerEvaluationContext.js'

export interface EnvironmentInitOptions {
  createAgent?: AgentFactory
  createTrainer?: TrainerFactory
  [key: string]: unknown // extensible for hydrated pathnames
}

/** Minimal evaluation context: just RNG + optional stats. Available everywhere. */
export interface BaseEvaluationContext {
  rng: RNG
  stats?: StatsRecorder
}

/** Partial worker context — required fields from Base, optional worker-specific fields. */
export type PartialEvaluationContext = Partial<WorkerEvaluationContext> &
  BaseEvaluationContext
