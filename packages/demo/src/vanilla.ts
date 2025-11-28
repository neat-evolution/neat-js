import type { Environment } from '@neat-evolution/environment'
import {
  createEvaluator as createVanillaEvaluator,
  type AnyAlgorithm,
  type EvaluatorFactory,
} from '@neat-evolution/evaluator'
import { createReproducer } from '@neat-evolution/evolution'
import { createExecutor } from '@neat-evolution/executor'

import { demo } from './demo.js'

const createEvaluator: EvaluatorFactory<any, any> = (
  algorithm: AnyAlgorithm<any>,
  environment: Environment<any>
) => {
  return createVanillaEvaluator(algorithm, environment, createExecutor)
}

try {
  await demo(createReproducer, createEvaluator)
} catch (error) {
  console.error(error)
  throw error
}
