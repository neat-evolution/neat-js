import type {
  AnyGenome,
  FitnessData,
  GenomeEntries,
} from '@neat-evolution/evaluator'

import type { EvaluationContext } from './EvaluationContext.js'

/**
 * Defines the interface for a pluggable evaluation strategy.
 * An evaluation strategy orchestrates how a set of genome entries are evaluated
 * using a given environment and executor factory.
 */
export interface EvaluationStrategy<G extends AnyGenome<G>> {
  /**
   * Evaluates a collection of genome entries and returns their fitness data.
   * The strategy determines the pattern of evaluation (e.g., individual, batch, tournament).
   * @param context The evaluation context, providing access to the environment and executor creation.
   * @param genomeEntries An iterable collection of genome entries to be evaluated.
   * @returns An async iterable that yields fitness data for the evaluated genomes.
   */
  evaluate: (
    context: EvaluationContext<G>,
    genomeEntries: GenomeEntries<G>
  ) => AsyncIterable<FitnessData>
}
