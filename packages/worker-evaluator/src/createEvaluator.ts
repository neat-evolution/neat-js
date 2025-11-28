import type { Environment } from '@neat-evolution/environment'
import type { AnyAlgorithm, Evaluator } from '@neat-evolution/evaluator'

import { WorkerEvaluator } from './WorkerEvaluator.js'
import type { WorkerEvaluatorOptions } from './WorkerEvaluatorOptions.js'

export const createEvaluator = <EFO>(
  algorithm: AnyAlgorithm<any>,
  environment: Environment<EFO>,
  options: WorkerEvaluatorOptions
): Evaluator<EFO> => {
  return new WorkerEvaluator(algorithm, environment, options)
}
