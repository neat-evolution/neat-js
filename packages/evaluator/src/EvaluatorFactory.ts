import type { Algorithm } from '@neat-js/core'
import type { Environment } from '@neat-js/environment'

import type { Evaluator } from './Evaluator.js'

export type EvaluatorFactory<O> = (
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
    any
  >,
  environment: Environment,
  options: O
) => Evaluator
