import type { Environment } from '@neat-evolution/environment'
import type { AnyErasedAlgorithm } from '@neat-evolution/evaluator'

import { WorkerEvaluator } from './WorkerEvaluator.js'
import type { WorkerEvaluatorOptions } from './WorkerEvaluatorOptions.js'

export const createEvaluator = <EFO>(
  algorithm: AnyErasedAlgorithm,
  environment: Environment<EFO>,
  options: WorkerEvaluatorOptions
): WorkerEvaluator<EFO> => {
  return new WorkerEvaluator(algorithm, environment, options)
}
