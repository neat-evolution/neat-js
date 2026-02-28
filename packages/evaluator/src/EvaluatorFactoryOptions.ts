import type { EvaluationStrategy } from '@neat-evolution/evaluation-strategy'
import type { ExecutorFactory } from '@neat-evolution/executor'
import type { AnyGenome } from './types.js'

export interface EvaluatorFactoryOptions<G extends AnyGenome<any> = any> {
  createExecutor: ExecutorFactory
  strategy?: EvaluationStrategy<G>
}
