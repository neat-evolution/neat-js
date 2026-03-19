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
  type ActorCriticStepAgentConfig,
  createActorCriticStepAgent,
} from './createActorCriticStepAgent.js'
import type { ActorCriticTransition } from './types.js'

interface ActorCriticStepAgentFactoryOptions extends StepAgentFactoryOptions {
  config: ActorCriticStepAgentConfig
  rngSeed: string
  isLamarckian?: boolean
}

function isActorCriticStepAgentFactoryOptions(
  options: StepAgentFactoryOptions
): options is ActorCriticStepAgentFactoryOptions {
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
      'Actor-critic step agent factory requires a TrainableExecutor'
    )
  }
  if (!isActorCriticStepAgentFactoryOptions(options)) {
    throw new Error(
      'Actor-critic step agent factory requires { config, rngSeed }'
    )
  }

  const { config, rngSeed, isLamarckian } = options

  if (isLamarckian !== false) {
    context?.scheduleWriteback?.(executor)
  }

  const onSegmentTrained = (
    segment: StepRolloutSegment<ActorCriticTransition>
  ): void => {
    context?.stats?.record('step.ac.segmentTrained', {
      transitions: segment.transitions.length,
      completedBy: segment.completedBy,
      episodeIndex: segment.episodeIndex,
    })
    config.onSegmentTrained?.(segment)
  }

  const rng = createRNG(rngSeed)

  return createActorCriticStepAgent(
    executor,
    {
      ...config,
      onSegmentTrained,
    },
    rng.gen
  )
}

export default createStepAgent
