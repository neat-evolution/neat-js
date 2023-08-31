import type { Environment } from '@neat-js/environment'
import { AsyncEvaluator } from '@neat-js/evaluator'
import type { EvaluatorFactory } from '@neat-js/evaluator'
import { createExecutor } from '@neat-js/executor'

import { demo } from './demo.js'

const createEvaluator: EvaluatorFactory<null> = (environment: Environment) => {
  // FIXME: make createExecutor an env variable
  return new AsyncEvaluator(environment, createExecutor)
}

await demo(createEvaluator)
