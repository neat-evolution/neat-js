import type { ExecutorFactory } from '@neat-evolution/executor'

import type { StandardEvaluatorFactory } from './EvaluatorFactory.js'
import { TestEvaluator } from './TestEvaluator.js'

export const createEvaluator: StandardEvaluatorFactory<ExecutorFactory> = (
  algorithm,
  environment,
  createExecutor
) => {
  return new TestEvaluator(algorithm, environment, createExecutor)
}
