import type { Algorithm } from '@neat-js/core'
import type { Environment } from '@neat-js/environment'
import { createEvaluator as createVanillaEvaluator } from '@neat-js/evaluator'
import type { EvaluatorFactory } from '@neat-js/evaluator'
import { createReproducer } from '@neat-js/evolution'
import { createExecutor } from '@neat-js/executor'

import { demo } from './demo.js'

const createEvaluator: EvaluatorFactory<null> = (
  algorithm: Algorithm<any, any, any, any, any, any, any, any>,
  environment: Environment
) => {
  // FIXME: make createExecutor an env variable
  return createVanillaEvaluator(algorithm, environment, createExecutor)
}

try {
  await demo(createReproducer, createEvaluator)
} catch (error) {
  console.error(error)
  throw error
}
