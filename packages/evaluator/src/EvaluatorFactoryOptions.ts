import type { EvaluationStrategy } from '@neat-evolution/evaluation-strategy'
import type { StatsRecorder } from '@neat-evolution/stats'
import type { RuntimeConfig } from './RuntimeConfig.js'
import type { AnyGenome } from './types.js'

export interface EvaluatorFactoryOptions<G extends AnyGenome = AnyGenome> {
  runtimeConfig?: RuntimeConfig
  strategy?: EvaluationStrategy<G>
  stats?: StatsRecorder

  /** Opt-in flag for UnsafeTestEvaluator. Required to construct it.
   *  Only use this for isolated unit tests that need a local in-process evaluator.
   *  For all other cases, use WorkerEvaluator via EvolutionManager. */
  unsafeLocalEvaluation?: boolean
}

