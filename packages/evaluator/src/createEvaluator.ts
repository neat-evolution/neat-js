import type { Algorithm } from '@neat-js/core'
import type { Environment } from '@neat-js/environment'
import type { ExecutorFactory } from '@neat-js/executor'

import { AsyncEvaluator } from './AsyncEvaluator.js'
import type { EvaluatorFactory } from './EvaluatorFactory.js'

export type AsyncEvaluatorFactoryOptions = ExecutorFactory

export const createEvaluator: EvaluatorFactory<AsyncEvaluatorFactoryOptions> = (
  algorithm: Algorithm<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
  environment: Environment,
  createExecutor: AsyncEvaluatorFactoryOptions
) => {
  return new AsyncEvaluator(algorithm, environment, createExecutor)
}
