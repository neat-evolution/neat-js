import type { Environment } from '@neat-js/environment'
import type { ExecutorFactory } from '@neat-js/executor'

import { AsyncEvaluator } from './AsyncEvaluator.js'
import type { EvaluatorFactory } from './EvaluatorFactory.js'

export type AsyncEvaluatorFactoryOptions = ExecutorFactory

export const createEvaluator: EvaluatorFactory<AsyncEvaluatorFactoryOptions> = (
  environment: Environment,
  createExecutor: AsyncEvaluatorFactoryOptions
) => {
  return new AsyncEvaluator(environment, createExecutor)
}
