import type { Executor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
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
  isLamarckian?: boolean
}

function isDeepQLearningStepAgentFactoryOptions(
  options: StepAgentFactoryOptions
): options is DeepQLearningStepAgentFactoryOptions {
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
    throw new Error('DQL step agent factory requires a TrainableExecutor')
  }
  if (!isDeepQLearningStepAgentFactoryOptions(options)) {
    throw new Error('DQL step agent factory requires { config }')
  }
  if (context == null) {
    throw new Error('DQL step agent factory requires context with rng')
  }

  const { config, isLamarckian } = options

  if (isLamarckian !== false) {
    context.scheduleWriteback?.(executor)
  }

  const agentRng = context.rng.derive('dql-agent')
  return createDeepQLearningStepAgent(executor, config, agentRng.gen)
}

export default createStepAgent
