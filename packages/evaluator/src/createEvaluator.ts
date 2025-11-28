import type { Environment } from '@neat-evolution/environment'
import type { ExecutorFactory } from '@neat-evolution/executor'

import type { Evaluator } from './Evaluator.js'
import { TestEvaluator } from './TestEvaluator.js'
import type { AnyAlgorithm } from './types.js'

export const createEvaluator = <EFO>(
  algorithm: AnyAlgorithm<any>,
  environment: Environment<EFO>,
  createExecutor: ExecutorFactory
): Evaluator<EFO> => {
  return new TestEvaluator(algorithm, environment, createExecutor)
}
