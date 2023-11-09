import type { Algorithm } from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import { createEvaluator as createVanillaEvaluator } from '@neat-evolution/evaluator'
import type { EvaluatorFactory } from '@neat-evolution/evaluator'
import { createReproducer } from '@neat-evolution/evolution'
import { createExecutor } from '@neat-evolution/executor'

import { demo } from './demo.js'

const createEvaluator: EvaluatorFactory<null> = (
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
