import type { Executor } from '@neat-evolution/executor'
import type { EpisodicAgent } from './EpisodicAgent.js'

export type AgentFactoryOptions = Record<string, unknown>

export type AgentFactory = (
  executor: Executor,
  agentFactoryOptions: AgentFactoryOptions,
  context?: unknown // EvaluationContext — typed as unknown to avoid circular dep
) => EpisodicAgent
