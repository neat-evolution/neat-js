import type { StatsRecorder } from '@neat-evolution/stats'
import type { AgentFactory } from './AgentFactory.js'

export interface EnvironmentRuntimeOptions {
  stats?: StatsRecorder
  agentFactory?: AgentFactory
  evaluationContext?: unknown // typed unknown to avoid circular dep
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
