import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
import type {
  StepAgentContext,
  StepAgentFactory,
  StepAgentFactoryOptions,
} from '../../index.js'
import {
  createPPOStepAgent,
  type PPOStepAgentConfig,
} from './createPPOStepAgent.js'

interface PPOStepAgentFactoryOptions extends StepAgentFactoryOptions {
  config: PPOStepAgentConfig
  isLamarckian?: boolean
}

function isPPOStepAgentFactoryOptions(
  options: StepAgentFactoryOptions
): options is PPOStepAgentFactoryOptions {
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
    throw new Error('PPO step agent factory requires a TrainableExecutor')
  }
  if (!isPPOStepAgentFactoryOptions(options)) {
    throw new Error('PPO step agent factory requires { config }')
  }
  if (context == null) {
    throw new Error('PPO step agent factory requires context with rng')
  }

  const { config, isLamarckian } = options
  if (isLamarckian !== false) {
    context.scheduleWriteback?.(executor)
  }

  const agentRng = context.rng.derive('ppo-agent')
  return createPPOStepAgent(executor, config, agentRng.gen)
}

export default createStepAgent
