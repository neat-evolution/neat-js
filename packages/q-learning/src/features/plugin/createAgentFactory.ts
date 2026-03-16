import type {
  AgentFactory,
  AgentFactoryOptions,
  PartialEvaluationContext,
  RolloutSegment,
} from '@neat-evolution/execution-manager'
import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type { QLAgentConfig } from '../../index.js'
import { createQLAgent } from '../../index.js'

interface QLAgentFactoryOptions extends AgentFactoryOptions {
  config: QLAgentConfig
  rngSeed: string
  isLamarckian?: boolean
}

function isQLAgentFactoryOptions(
  options: AgentFactoryOptions
): options is QLAgentFactoryOptions {
  return (
    'config' in options &&
    typeof options.config === 'object' &&
    options.config !== null &&
    'rngSeed' in options &&
    typeof options.rngSeed === 'string'
  )
}

/**
 * Agent factory for Q-Learning training.
 *
 * Creates a QL agent from a trainable executor, schedules Lamarckian
 * writeback via context, and records segment telemetry to context.stats.
 */
export const createAgent: AgentFactory = (
  executor: Executor,
  agentFactoryOptions: AgentFactoryOptions,
  context?: PartialEvaluationContext
) => {
  if (!isTrainableExecutor(executor)) {
    throw new Error('QL agent factory requires a TrainableExecutor')
  }
  if (!isQLAgentFactoryOptions(agentFactoryOptions)) {
    throw new Error(
      'QL agent factory requires { config: QLAgentConfig, rngSeed: string }'
    )
  }

  const { config, rngSeed, isLamarckian } = agentFactoryOptions

  if (isLamarckian !== false && context != null) {
    context.scheduleWriteback?.(executor)
  }

  const onSegmentTrained = (segment: RolloutSegment): void => {
    if (context?.stats != null) {
      context.stats.record('ql.segmentTrained', {
        transitions: segment.transitions.length,
        trigger: segment.trigger,
      })
    }
    config.onSegmentTrained?.(segment)
  }

  const rng = createRNG(rngSeed)
  return createQLAgent(executor, { ...config, onSegmentTrained }, rng)
}

export default createAgent
