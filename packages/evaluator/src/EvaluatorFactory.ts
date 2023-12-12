import type {
  Environment,
  StandardEnvironment,
} from '@neat-evolution/environment'
import type { Executor, SyncExecutor } from '@neat-evolution/executor'

import type { Evaluator, StandardEvaluator } from './Evaluator.js'
import type { AnyAlgorithm } from './types.js'

export type EvaluatorFactory<
  O,
  E extends SyncExecutor[],
  EA extends Executor[],
  ER,
> = (
  algorithm: AnyAlgorithm<any>,
  environment: Environment<any, E, EA, ER>,
  options: O
) => Evaluator<E, EA, ER>

export type StandardEvaluatorFactory<O> = (
  algorithm: AnyAlgorithm<any>,
  environment: StandardEnvironment<any>,
  options: O
) => StandardEvaluator
