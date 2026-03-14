import type {
  AnyGenome,
  FitnessData,
  GenomeEntry,
  PhenotypeAction,
} from '@neat-evolution/core'
import type { EpisodicContext } from '@neat-evolution/environment'
import type { StatsRecorder } from '@neat-evolution/stats'
import type { DispatcherContext } from '@neat-evolution/worker-actions'
import type { WorkerTrainingCapabilities } from './WorkerTrainingCapabilities.js'

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
   * Capabilities reported by WorkerEvaluator after worker initialization.
   * Plugins can inspect this before dispatching custom worker actions.
   */
  workerTrainingCapabilities?: WorkerTrainingCapabilities

  /**
   * Episodic context hooks provided by RL plugins.
   * Set per-genome by PluginStrategy before calling defaultEvaluate.
   * This is a partial integration surface; direct agent evaluation is the
   * primary RL path when the environment supports it.
   */
  episodicContext?: EpisodicContext

  /**
   * Optional callback for plugins to record Lamarckian writeback data.
   * PluginStrategy calls this when a plugin returns updatedActions in EvaluationResult.
   * The evaluator (Local or Worker) stores the data and applies writebacks after evaluation.
   */
  recordWriteback?: (genome: G, updatedActions: PhenotypeAction[]) => void

  /**
   * Optional callback for plugins to record telemetry data.
   * PluginStrategy calls this when a plugin returns telemetry in EvaluationResult.
   * The evaluator stores it for later retrieval via getTelemetry().
   */
  recordTelemetry?: (genome: G, telemetry: unknown) => void

  /**
   * Retrieve telemetry stored by the evaluator for a genome.
   * Worker evaluation stores telemetry directly in the evaluator; plugins
   * can read it back via this method to populate their own caches.
   */
  getTelemetry?: (genome: G) => unknown

  /** Optional stats recorder for evaluation-level metrics. */
  stats?: StatsRecorder
}
