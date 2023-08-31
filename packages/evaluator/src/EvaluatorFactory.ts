import type { Environment } from '@neat-js/environment'

import type { Evaluator } from './Evaluator.js'

export type EvaluatorFactory<O> = (
  environment: Environment,
  options: O
) => Evaluator
