import type { AnyGenome, FitnessData, GenomeEntry } from '@neat-evolution/core'
import type { StaticExecutor } from '@neat-evolution/executor'
import type { StatsRecorder } from '@neat-evolution/stats'
import type { DispatcherContext } from '@neat-evolution/worker-actions'

export interface EvaluationContext<G extends AnyGenome = AnyGenome>
  extends DispatcherContext {
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

  /** Optional stats recorder for evaluation-level metrics. */
  stats?: StatsRecorder

  /** Schedule Lamarckian writeback for an executor.
   *  Part of the shared evaluation surface — implementations differ by side. */
  scheduleWriteback?: (executor: StaticExecutor) => void

  /** Register callback that fires after fitness is decided and writebacks are flushed. */
  onFitness?: (callback: (fitness: number) => void) => void
}
