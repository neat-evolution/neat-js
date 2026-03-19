import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type {
  StepAgentContext,
  StepAgentFactory,
  StepAgentFactoryOptions,
} from '../../index.js'
import {
  type A2CStepAgentConfig,
  createA2CStepAgent,
} from './createA2CStepAgent.js'

interface A2CStepAgentFactoryOptions extends StepAgentFactoryOptions {
  config: A2CStepAgentConfig
  rngSeed: string
  isLamarckian?: boolean
}

function isA2CStepAgentFactoryOptions(
  options: StepAgentFactoryOptions
): options is A2CStepAgentFactoryOptions {
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
    throw new Error('A2C step agent factory requires a TrainableExecutor')
  }
  if (!isA2CStepAgentFactoryOptions(options)) {
    throw new Error('A2C step agent factory requires { config, rngSeed }')
  }

  const { config, rngSeed, isLamarckian } = options
  if (isLamarckian !== false) {
    context?.scheduleWriteback?.(executor)
  }

  const rng = createRNG(rngSeed)
  return createA2CStepAgent(executor, config, rng.gen)
}

export default createStepAgent
