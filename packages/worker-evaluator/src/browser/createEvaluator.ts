import type { Environment } from '@neat-js/environment'
import type { EvaluatorFactory } from '@neat-js/evaluator'

import {
  WorkerEvaluator,
  type WorkerEvaluatorOptions,
} from './WorkerEvaluator.js'

export const createEvaluator: EvaluatorFactory<WorkerEvaluatorOptions> = (
  environment: Environment,
  options: WorkerEvaluatorOptions
) => {
  return new WorkerEvaluator(environment, options)
}
