import type {
  AnyGenome,
  FitnessData,
  GenomeEntries,
} from '@neat-evolution/core'
import type { EpisodicContext } from '@neat-evolution/environment'

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

  constructor(
    plugins: ReadonlyArray<EvaluationPlugin<G>>,
    pluginContext: PluginContext
  ) {
    this.plugins = plugins
    this.pluginContext = pluginContext

    // Initialize plugins once at registration time
    for (const plugin of plugins) {
      plugin.initialize?.(pluginContext)
    }
  }

  async *evaluate(
    context: EvaluationContext<G>,
    genomeEntries: GenomeEntries<G>
  ): AsyncIterable<FitnessData> {
    const evaluatePlugin = this.plugins.find((p) => p.evaluateGenome)
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

        const defaultEvaluate = async (g: G): Promise<number> => {
          const result = await genomeContext.evaluateGenomeEntry([
            speciesIndex,
            organismIndex,
            g,
          ])
          return result[2]
        }

        promise = evaluatePlugin
          .evaluateGenome(genome, defaultEvaluate, genomeContext)
          .then((result): FitnessData => {
            evaluated.push({ genome, fitness: result.fitness })
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
   * Returns undefined if no plugins provide hooks.
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
          ? (executor, reward, done) => {
              prev(executor, reward, done)
              curr(executor, reward, done)
            }
          : curr
      }
      if (hooks.episodeStart) {
        const prev = merged.episodeStart
        const curr = hooks.episodeStart
        merged.episodeStart = prev
          ? (executor, info) => {
              prev(executor, info)
              curr(executor, info)
            }
          : curr
      }
      if (hooks.episodeEnd) {
        const prev = merged.episodeEnd
        const curr = hooks.episodeEnd
        merged.episodeEnd = prev
          ? (executor, result) => {
              prev(executor, result)
              curr(executor, result)
            }
          : curr
      }
      if (hooks.annotateFrame) {
        const prev = merged.annotateFrame
        const curr = hooks.annotateFrame
        merged.annotateFrame = prev
          ? (executor, annotation) => {
              prev(executor, annotation)
              curr(executor, annotation)
            }
          : curr
      }
    }

    return merged
  }
}
