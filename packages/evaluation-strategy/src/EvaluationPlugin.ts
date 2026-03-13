import type {
  AnyAlgorithm,
  AnyGenome,
  PhenotypeAction,
} from '@neat-evolution/core'
import type { Environment, EpisodicContext } from '@neat-evolution/environment'

import type { EvaluationContext } from './EvaluationContext.js'

/** Result returned by a plugin's evaluateGenome method. */
export interface EvaluationResult {
  fitness: number
  /** Updated network weights for Lamarckian writeback. */
  updatedActions?: PhenotypeAction[]
}

/** Static context available to plugins during initialize() and afterFitness(). */
export interface PluginContext {
  algorithm: AnyAlgorithm
  environment: Environment
  /** Whether worker threads are available for training dispatch. */
  supportsTraining: boolean
}

/**
 * An EvaluationPlugin augments genome evaluation without owning the loop.
 * Plugins compose — multiple plugins can be active simultaneously.
 *
 * Two usage patterns:
 * - Replacement: Plugin handles evaluation entirely (BackpropPlugin)
 * - Augmentation: Plugin provides episodic hooks, delegates to defaultEvaluate
 */
export interface EvaluationPlugin<G extends AnyGenome = AnyGenome> {
  /** Called once when the plugin is registered. Validate environment compatibility. */
  initialize?(context: PluginContext): void

  /**
   * Wrap or replace evaluation for a single genome.
   * The plugin can:
   * - Call defaultEvaluate(genome) to run normal evaluation (augmentation)
   * - Skip defaultEvaluate and train/evaluate itself (replacement)
   * - Do both (train, then evaluate)
   */
  evaluateGenome?(
    genome: G,
    defaultEvaluate: (genome: G) => Promise<number>,
    context: EvaluationContext<G>
  ): Promise<EvaluationResult>

  /**
   * Called after fitness is assigned but before reproduction/mutation.
   * Use for Lamarckian writeback — the genome still exists and is mutable.
   */
  afterFitness?(genome: G, fitness: number, context: PluginContext): void

  /**
   * Provide typed context hooks for the environment.
   * For RL plugins: returns Partial<EpisodicContext> (reward, episodeStart, episodeEnd, transitionInfo)
   * For BackpropPlugin: not used (BackpropPlugin replaces evaluation)
   */
  getContextHooks?(): Partial<EpisodicContext>
}
