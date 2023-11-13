import { createEvaluator as createVanillaEvaluator } from '@neat-evolution/evaluator'
import type { StandardEvaluatorFactory } from '@neat-evolution/evaluator'
import { createReproducer } from '@neat-evolution/evolution'
import { createExecutor } from '@neat-evolution/executor'

import { demo } from './demo.js'

const createEvaluator: StandardEvaluatorFactory<any> = (
  algorithm,
  environment
) => {
  return createVanillaEvaluator(algorithm, environment, createExecutor)
}

try {
  await demo(createReproducer, createEvaluator)
} catch (error) {
  console.error(error)
  throw error
}
