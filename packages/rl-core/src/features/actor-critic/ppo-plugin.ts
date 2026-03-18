import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
import { createRNG } from '@neat-evolution/utils'
import type {
  StepAgentContext,
  StepAgentFactory,
  StepAgentFactoryOptions,
} from '../../index.js'
import { createPPOStepAgent, type PPOStepAgentConfig } from './createPPOStepAgent.js'

interface PPOStepAgentFactoryOptions extends StepAgentFactoryOptions {
  config: PPOStepAgentConfig
  rngSeed: string
  isLamarckian?: boolean
}

function isPPOStepAgentFactoryOptions(
  options: StepAgentFactoryOptions
): options is PPOStepAgentFactoryOptions {
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
    throw new Error('PPO step agent factory requires a TrainableExecutor')
  }
  if (!isPPOStepAgentFactoryOptions(options)) {
    throw new Error('PPO step agent factory requires { config, rngSeed }')
  }

  const { config, rngSeed, isLamarckian } = options
  if (isLamarckian !== false) {
    context?.scheduleWriteback?.(executor)
  }

  const rng = createRNG(rngSeed)
  return createPPOStepAgent(executor, config, rng.gen)
}

export default createStepAgent
