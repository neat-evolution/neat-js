import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
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
  isLamarckian?: boolean
}

function isActorCriticStepAgentFactoryOptions(
  options: StepAgentFactoryOptions
): options is ActorCriticStepAgentFactoryOptions {
  return (
    'config' in options &&
    typeof options.config === 'object' &&
    options.config !== null
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
    throw new Error('Actor-critic step agent factory requires { config }')
  }
  if (context == null) {
    throw new Error('Actor-critic step agent factory requires context with rng')
  }

  const { config, isLamarckian } = options

  if (isLamarckian !== false) {
    context.scheduleWriteback?.(executor)
  }

  const onSegmentTrained = (
    segment: StepRolloutSegment<ActorCriticTransition>
  ): void => {
    context.stats?.record('step.ac.segmentTrained', {
      transitions: segment.transitions.length,
      completedBy: segment.completedBy,
      episodeIndex: segment.episodeIndex,
    })
    config.onSegmentTrained?.(segment)
  }

  const agentRng = context.rng.derive('ac-agent')

  return createActorCriticStepAgent(
    executor,
    {
      ...config,
      onSegmentTrained,
    },
    agentRng.gen
  )
}

export default createStepAgent
