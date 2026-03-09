import type { Environment } from '@neat-evolution/environment'

import type { Evaluator } from './Evaluator.js'
import type { AnyAlgorithm } from './types.js'

export type EvaluatorFactory<EFO = unknown, O = unknown> = (
  algorithm: AnyAlgorithm,
  environment: Environment<EFO>,
  options: O
) => Evaluator<EFO>
