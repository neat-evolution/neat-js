import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type {
  StepAgentContext,
  StepAgentFactory,
  StepAgentFactoryOptions,
} from '../../index.js'
import type { StepRolloutSegment } from '../rollout/StepRolloutBuffer.js'
import {
  createQLearningStepAgent,
  type QLearningStepAgentConfig,
} from './createQLearningStepAgent.js'
import type { QLearningTransition } from './types.js'

interface QLearningStepAgentFactoryOptions extends StepAgentFactoryOptions {
  config: QLearningStepAgentConfig
  rngSeed: string
  isLamarckian?: boolean
}

function isQLearningStepAgentFactoryOptions(
  options: StepAgentFactoryOptions
): options is QLearningStepAgentFactoryOptions {
  return (
    'config' in options &&
    typeof options.config === 'object' &&
    options.config !== null &&
    'rngSeed' in options &&
    typeof options.rngSeed === 'string'
  )
}

export const createStepAgent: StepAgentFactory = (
  executor: Executor,
  options: StepAgentFactoryOptions,
  context?: StepAgentContext
) => {
  if (!isTrainableExecutor(executor)) {
    throw new Error(
      'Q-learning step agent factory requires a TrainableExecutor'
    )
  }
  if (!isQLearningStepAgentFactoryOptions(options)) {
    throw new Error(
      'Q-learning step agent factory requires { config, rngSeed }'
    )
  }

  const { config, rngSeed, isLamarckian } = options

  if (isLamarckian !== false) {
    context?.scheduleWriteback?.(executor)
  }

  const onSegmentTrained = (
    segment: StepRolloutSegment<QLearningTransition>
  ): void => {
    context?.stats?.record('step.ql.segmentTrained', {
      transitions: segment.transitions.length,
      completedBy: segment.completedBy,
      episodeIndex: segment.episodeIndex,
    })
    config.onSegmentTrained?.(segment)
  }

  const rng = createRNG(rngSeed)

  return createQLearningStepAgent(
    executor,
    {
      ...config,
      onSegmentTrained,
    },
    rng.gen
  )
}

export default createStepAgent
