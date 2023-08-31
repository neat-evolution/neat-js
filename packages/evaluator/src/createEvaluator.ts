import type { Environment } from '@neat-js/environment'
import type { ExecutorFactory } from '@neat-js/executor'

import { AsyncEvaluator } from './AsyncEvaluator.js'

export const createEvaluator = (
  environment: Environment,
  options: ExecutorFactory
) => {
  return new AsyncEvaluator(environment, options)
}
