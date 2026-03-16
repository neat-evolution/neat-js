import type {
  AgentFactory,
  AgentFactoryOptions,
  PartialEvaluationContext,
  RolloutSegment,
} from '@neat-evolution/execution-manager'
import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type { ACAgentConfig } from '../../index.js'
import { createACAgent } from '../../index.js'

interface ACAgentFactoryOptions extends AgentFactoryOptions {
  config: ACAgentConfig
  rngSeed: string
  isLamarckian?: boolean
}

function isACAgentFactoryOptions(
  options: AgentFactoryOptions
): options is ACAgentFactoryOptions {
  return (
    'config' in options &&
    typeof options.config === 'object' &&
    options.config !== null &&
    'rngSeed' in options &&
    typeof options.rngSeed === 'string'
  )
}

/**
 * Agent factory for Actor-Critic training.
 *
 * Creates an AC agent from a trainable executor, schedules Lamarckian
 * writeback via context, and records segment telemetry to context.stats.
 */
export const createAgent: AgentFactory = (
  executor: Executor,
  agentFactoryOptions: AgentFactoryOptions,
  context?: PartialEvaluationContext
) => {
  if (!isTrainableExecutor(executor)) {
    throw new Error('AC agent factory requires a TrainableExecutor')
  }
  if (!isACAgentFactoryOptions(agentFactoryOptions)) {
    throw new Error(
      'AC agent factory requires { config: ACAgentConfig, rngSeed: string }'
    )
  }

  const { config, rngSeed, isLamarckian } = agentFactoryOptions

  if (isLamarckian !== false && context != null) {
    context.scheduleWriteback?.(executor)
  }

  const onSegmentTrained = (segment: RolloutSegment): void => {
    if (context?.stats != null) {
      context.stats.record('ac.segmentTrained', {
        transitions: segment.transitions.length,
        trigger: segment.trigger,
      })
    }
    config.onSegmentTrained?.(segment)
  }

  const rng = createRNG(rngSeed)
  return createACAgent(executor, { ...config, onSegmentTrained }, rng.gen)
}

export default createAgent
