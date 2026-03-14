import type {
  AnyGenome,
  FitnessData,
  GenomeEntries,
} from '@neat-evolution/core'
import type {
  EpisodeInfo,
  EpisodeResult,
  EpisodicContext,
  TransitionInfo,
} from '@neat-evolution/environment'
import type { Executor } from '@neat-evolution/executor'

import type { EvaluationContext } from '../EvaluationContext.js'
import type { EvaluationPlugin, PluginContext } from '../EvaluationPlugin.js'
import type { EvaluationStrategy } from '../EvaluationStrategy.js'

/**
 * A strategy that applies EvaluationPlugin hooks to per-genome evaluation.
 * Evaluates genomes individually (like IndividualStrategy) but routes
 * each genome through registered plugins.
 *
 * - First plugin with evaluateGenome() handles evaluation (replacement or augmentation)
 * - All plugins receive afterFitness() after all genomes are evaluated
 * - Plugins are initialized once at construction time
 */
export class PluginStrategy<G extends AnyGenome = AnyGenome>
  implements EvaluationStrategy<G>
{
  private readonly plugins: ReadonlyArray<EvaluationPlugin<G>>
  private readonly pluginContext: PluginContext
  private readonly replacementPlugin: EvaluationPlugin<G> | undefined

  constructor(
    plugins: ReadonlyArray<EvaluationPlugin<G>>,
    pluginContext: PluginContext
  ) {
    this.plugins = plugins
    this.pluginContext = pluginContext
    const replacementPlugins = plugins.filter(
      (plugin) => (plugin.mode ?? 'augmentation') === 'replacement'
    )
    if (replacementPlugins.length > 1) {
      throw new Error(
        'Only one replacement evaluation plugin can be registered at a time.'
      )
    }
    if (replacementPlugins.length === 1 && plugins.length > 1) {
      throw new Error(
        'Replacement evaluation plugins cannot compose with additional plugins.'
      )
    }
    this.replacementPlugin = replacementPlugins[0]

    // Initialize plugins once at registration time
    for (const plugin of plugins) {
      plugin.initialize?.(pluginContext)
    }
  }

  /**
   * Collect worker plugin data from all plugins.
   * Called after initialization so plugins can build config from environment data.
   * Returns merged data to be sent to workers via pluginData.
   */
  collectWorkerPluginData(): Record<string, unknown> {
    const merged: Record<string, unknown> = {}
    for (const plugin of this.plugins) {
      if (plugin.getWorkerPluginData != null) {
        Object.assign(merged, plugin.getWorkerPluginData())
      }
    }
    return merged
  }

  async *evaluate(
    context: EvaluationContext<G>,
    genomeEntries: GenomeEntries<G>
  ): AsyncIterable<FitnessData> {
    const evaluatePlugin =
      this.replacementPlugin ?? this.plugins.find((p) => p.evaluateGenome)
    const evaluated: Array<{ genome: G; fitness: number }> = []
    const promises: Array<Promise<FitnessData>> = []

    // Launch all evaluations in parallel
    for (const entry of genomeEntries) {
      const [speciesIndex, organismIndex, genome] = entry

      let promise: Promise<FitnessData>

      if (evaluatePlugin?.evaluateGenome) {
        // Merge context hooks from all plugins for this evaluation
        const mergedHooks = this.mergeContextHooks()

        // Create a per-genome context with episodic hooks injected
        const genomeContext: EvaluationContext<G> = mergedHooks
          ? { ...context, episodicContext: mergedHooks }
          : context

        const defaultEvaluate = async (
          g: G,
          seed?: string
        ): Promise<number> => {
          const result = await genomeContext.evaluateGenomeEntry(
            [speciesIndex, organismIndex, g],
            seed
          )
          return result[2]
        }

        promise = evaluatePlugin
          .evaluateGenome(genome, defaultEvaluate, genomeContext)
          .then((result): FitnessData => {
            evaluated.push({ genome, fitness: result.fitness })
            if (result.updatedActions != null) {
              context.recordWriteback?.(genome, result.updatedActions)
            }
            if (result.telemetry != null) {
              context.recordTelemetry?.(genome, result.telemetry)
            }
            return [speciesIndex, organismIndex, result.fitness]
          })
      } else {
        promise = context
          .evaluateGenomeEntry(entry)
          .then((fitnessData): FitnessData => {
            evaluated.push({ genome, fitness: fitnessData[2] })
            return fitnessData
          })
      }

      promises.push(promise)
    }

    // Yield results sequentially (preserves ordering)
    for (const p of promises) {
      yield await p
    }

    // afterFitness fires after all fitness is assigned, before reproduction
    for (const { genome, fitness } of evaluated) {
      for (const plugin of this.plugins) {
        plugin.afterFitness?.(genome, fitness, this.pluginContext)
      }
    }
  }

  /**
   * Merge context hooks from all plugins that provide them.
   * Hooks are a supplemental signal path (reward, lifecycle, metadata) and
   * never replace the direct `evaluateAgent()` contract. When no plugin
   * supplies hooks, evaluation proceeds with the plain agent/environment loop.
   */
  private mergeContextHooks(): EpisodicContext | undefined {
    const hookProviders = this.plugins.filter((p) => p.getContextHooks)
    if (hookProviders.length === 0) {
      return undefined
    }

    const merged: EpisodicContext = {}
    for (const plugin of hookProviders) {
      const hooks = plugin.getContextHooks?.()
      if (hooks === undefined) {
        continue
      }
      if (hooks.reward) {
        const prev = merged.reward
        const curr = hooks.reward
        merged.reward = prev
          ? (executor: Executor, reward: number, done: boolean) => {
              prev(executor, reward, done)
              curr(executor, reward, done)
            }
          : curr
      }
      if (hooks.episodeStart) {
        const prev = merged.episodeStart
        const curr = hooks.episodeStart
        merged.episodeStart = prev
          ? (executor: Executor, info: EpisodeInfo) => {
              prev(executor, info)
              curr(executor, info)
            }
          : curr
      }
      if (hooks.episodeEnd) {
        const prev = merged.episodeEnd
        const curr = hooks.episodeEnd
        merged.episodeEnd = prev
          ? (executor: Executor, result: EpisodeResult) => {
              prev(executor, result)
              curr(executor, result)
            }
          : curr
      }
      if (hooks.transitionInfo) {
        const prev = merged.transitionInfo
        const curr = hooks.transitionInfo
        merged.transitionInfo = prev
          ? (executor: Executor, info: TransitionInfo) => {
              prev(executor, info)
              curr(executor, info)
            }
          : curr
      }
    }

    return merged
  }
}
