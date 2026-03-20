import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
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
  isLamarckian?: boolean
}

function isA2CStepAgentFactoryOptions(
  options: StepAgentFactoryOptions
): options is A2CStepAgentFactoryOptions {
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
    throw new Error('A2C step agent factory requires a TrainableExecutor')
  }
  if (!isA2CStepAgentFactoryOptions(options)) {
    throw new Error('A2C step agent factory requires { config }')
  }
  if (context == null) {
    throw new Error('A2C step agent factory requires context with rng')
  }

  const { config, isLamarckian } = options
  if (isLamarckian !== false) {
    context.scheduleWriteback?.(executor)
  }

  const agentRng = context.rng.derive('a2c-agent')
  return createA2CStepAgent(executor, config, agentRng.gen)
}

export default createStepAgent
