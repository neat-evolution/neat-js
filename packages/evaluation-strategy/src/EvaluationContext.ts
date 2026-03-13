import type { AnyGenome, FitnessData, GenomeEntry } from '@neat-evolution/core'
import type { EpisodicContext } from '@neat-evolution/environment'
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

  /**
   * Whether worker plugins are loaded and available for custom dispatch.
   * Set by WorkerEvaluator when pluginPaths are configured.
   */
  supportsTraining?: boolean

  /**
   * Episodic context hooks provided by RL plugins.
   * Set per-genome by PluginStrategy before calling defaultEvaluate.
   * The evaluator threads these to environment.evaluate(executor, context).
   */
  episodicContext?: EpisodicContext
}
