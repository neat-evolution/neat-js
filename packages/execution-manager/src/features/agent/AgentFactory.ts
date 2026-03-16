import type { Executor } from '@neat-evolution/executor'
import type { PartialEvaluationContext } from '../runtime/EnvironmentRuntimeOptions.js'
import type { EpisodicAgent } from './EpisodicAgent.js'

export type AgentFactoryOptions = Record<string, unknown>

export type AgentFactory = (
  executor: Executor,
  agentFactoryOptions: AgentFactoryOptions,
  context?: PartialEvaluationContext
) => EpisodicAgent
