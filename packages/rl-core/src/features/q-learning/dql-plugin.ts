import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type {
  StepAgentContext,
  StepAgentFactory,
  StepAgentFactoryOptions,
} from '../../index.js'
import {
  createDeepQLearningStepAgent,
  type DeepQLearningStepAgentConfig,
} from './createDeepQLearningStepAgent.js'

interface DeepQLearningStepAgentFactoryOptions extends StepAgentFactoryOptions {
  config: DeepQLearningStepAgentConfig
  rngSeed: string
  isLamarckian?: boolean
}

function isDeepQLearningStepAgentFactoryOptions(
  options: StepAgentFactoryOptions
): options is DeepQLearningStepAgentFactoryOptions {
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
    throw new Error('DQL step agent factory requires a TrainableExecutor')
  }
  if (!isDeepQLearningStepAgentFactoryOptions(options)) {
    throw new Error('DQL step agent factory requires { config, rngSeed }')
  }

  const { config, rngSeed, isLamarckian } = options

  if (isLamarckian !== false) {
    context?.scheduleWriteback?.(executor)
  }

  const rng = createRNG(rngSeed)
  return createDeepQLearningStepAgent(executor, config, rng.gen)
}

export default createStepAgent
