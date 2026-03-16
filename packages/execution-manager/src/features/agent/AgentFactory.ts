import type { Executor } from '@neat-evolution/executor'
import type { WorkerEvaluationContext } from '../runtime/WorkerEvaluationContext.js'
import type { EpisodicAgent } from './EpisodicAgent.js'

export type AgentFactoryOptions = Record<string, unknown>

export type AgentFactory = (
  executor: Executor,
  agentFactoryOptions: AgentFactoryOptions,
  context?: WorkerEvaluationContext
) => EpisodicAgent
