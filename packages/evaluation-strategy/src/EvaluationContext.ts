import type {
  AnyGenome,
  FitnessData,
  GenomeEntry,
} from '@neat-evolution/evaluator'
import type { DispatcherContext } from '@neat-evolution/worker-actions'

export interface EvaluationContext<
  G extends AnyGenome<G>,
> extends DispatcherContext {
  /**
   * Evaluates a single genome, 1-to-1.
   * (e.g., for a dataset)
   */
  evaluateGenomeEntry: (
    genomeEntry: GenomeEntry<G>,
    seed?: string
  ) => Promise<FitnessData>

  /**
   * Evaluates a batch of genomes *together* in one call.
   * This is critical for tournaments. The context ensures
   * these are all sent to the *same* worker and evaluated
   * by `Environment.evaluateBatch`.
   */
  evaluateGenomeEntryBatch: (
    genomeEntries: Array<GenomeEntry<G>>,
    seed?: string
  ) => Promise<FitnessData[]>
}
