import type { Executor } from '@neat-evolution/executor'
import type { StepAgent, StepAgentContext } from './StepAgent.js'

export type StepAgentFactoryOptions = Record<string, unknown>

export type StepAgentFactory = (
  executor: Executor,
  stepAgentFactoryOptions: StepAgentFactoryOptions,
  context?: StepAgentContext
) => StepAgent
