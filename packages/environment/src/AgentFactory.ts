import type { Executor } from '@neat-evolution/executor'
import type { EpisodicAgent } from './EpisodicAgent.js'
import type { WorkerEvaluationContext } from './WorkerEvaluationContext.js'

export type AgentFactoryOptions = Record<string, unknown>

export type AgentFactory = (
  executor: Executor,
  agentFactoryOptions: AgentFactoryOptions,
  context?: WorkerEvaluationContext
) => EpisodicAgent
