import type { StandardEnvironment } from '@neat-evolution/environment'
import type {
  AnyAlgorithm,
  StandardEvaluatorFactory,
} from '@neat-evolution/evaluator'

import { WorkerEvaluator } from './WorkerEvaluator.js'
import type { WorkerEvaluatorOptions } from './WorkerEvaluatorOptions.js'

export const createEvaluator: StandardEvaluatorFactory<
  WorkerEvaluatorOptions
> = (
  algorithm: AnyAlgorithm<any>,
  environment: StandardEnvironment<any>,
  options: WorkerEvaluatorOptions
) => {
  return new WorkerEvaluator(algorithm, environment, options)
}
