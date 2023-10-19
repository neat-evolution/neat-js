import type { Algorithm } from '@neat-js/core'
import type { Environment } from '@neat-js/environment'
import type { EvaluatorFactory } from '@neat-js/evaluator'

import { WorkerEvaluator } from './WorkerEvaluator.js'
import type { WorkerEvaluatorOptions } from './WorkerEvaluatorOptions.js'

export const createEvaluator: EvaluatorFactory<WorkerEvaluatorOptions> = (
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
  options: WorkerEvaluatorOptions
) => {
  return new WorkerEvaluator(algorithm, environment, options)
}
