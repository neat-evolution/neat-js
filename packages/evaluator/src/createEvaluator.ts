import type { Environment } from '@neat-evolution/environment'

import type { Evaluator } from './Evaluator.js'
import type { EvaluatorFactoryOptions } from './EvaluatorFactoryOptions.js'
import type { AnyAlgorithm } from './types.js'
import { UnsafeTestEvaluator } from './UnsafeTestEvaluator.js'

export const createEvaluator = <EFO>(
  algorithm: AnyAlgorithm,
  environment: Environment<EFO>,
  options: EvaluatorFactoryOptions
): Evaluator<EFO> => {
  return new UnsafeTestEvaluator(algorithm, environment, options)
}
