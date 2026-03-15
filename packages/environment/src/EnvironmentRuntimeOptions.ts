import type { StatsRecorder } from '@neat-evolution/stats'
import type { AgentFactory } from './AgentFactory.js'
import type { TrainerFactory } from './TrainerFactory.js'
import type { WorkerEvaluationContext } from './WorkerEvaluationContext.js'

export interface EnvironmentRuntimeOptions {
  stats?: StatsRecorder
  agentFactory?: AgentFactory
  trainerFactory?: TrainerFactory
  evaluationContext?: WorkerEvaluationContext
  [key: string]: unknown // extensible for hydrated pathnames
}

export interface RuntimeConfigurable {
  setRuntimeOptions(options: EnvironmentRuntimeOptions): void
}

export function isRuntimeConfigurable(
  env: unknown
): env is RuntimeConfigurable {
  return typeof env === 'object' && env !== null && 'setRuntimeOptions' in env
}
