import type { Algorithm } from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import type { EvaluatorFactory } from '@neat-evolution/evaluator'

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
