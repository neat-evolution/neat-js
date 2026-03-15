import type { Environment } from '@neat-evolution/environment'

import type { Evaluator } from './Evaluator.js'
import type { EvaluatorFactoryOptions } from './EvaluatorFactoryOptions.js'
import { TestEvaluator } from './TestEvaluator.js'
import type { AnyAlgorithm } from './types.js'

export const createEvaluator = <EFO>(
  algorithm: AnyAlgorithm,
  environment: Environment<EFO>,
  options: EvaluatorFactoryOptions
): Evaluator<EFO> => {
  return new TestEvaluator(algorithm, environment, options)
}
