import type { Algorithm } from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import type { ExecutorFactory } from '@neat-evolution/executor'

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
