import type {
  AnyAlgorithm,
  AnyGenome,
  PhenotypeAction,
} from '@neat-evolution/core'
import {
  isSupervisedEnvironment,
  type SupervisedEnvironment,
} from '@neat-evolution/environment'
import type {
  EvaluationContext,
  EvaluationPlugin,
  EvaluationResult,
  PluginContext,
} from '@neat-evolution/evaluation-strategy'

import { requestTrainGenome, type TrainGenomeResult } from './actions.js'
import { trainGenome } from './trainGenome.js'

export interface BackpropPluginOptions {
  trainingEpochs: number
  learningRate: number
  /** Write trained weights back to genome. Default: true (Lamarckian). */
  isLamarckian?: boolean
}

const defaultBackpropPluginOptions: Required<BackpropPluginOptions> = {
  trainingEpochs: 10,
  learningRate: 0.01,
  isLamarckian: true,
}

/**
 * EvaluationPlugin that trains genomes via backpropagation on supervised data.
 *
 * Uses the REPLACEMENT pattern: evaluateGenome() does NOT call defaultEvaluate.
 * It runs its own forward/backward training loop, then evaluates on validation data.
 *
 * Lamarckian writeback is handled via afterFitness(): trained weights are written
 * back to the genome after fitness is assigned.
 */
export class BackpropPlugin<G extends AnyGenome = AnyGenome>
  implements EvaluationPlugin<G>
{
  readonly mode = 'replacement'
  private readonly algorithm: AnyAlgorithm
  private readonly options: Required<BackpropPluginOptions>
  private supervisedEnvironment: SupervisedEnvironment | undefined

  /** Tracks updated actions per genome for writeback in afterFitness. */
  private readonly pendingWritebacks = new Map<G, PhenotypeAction[]>()

  constructor(
    algorithm: AnyAlgorithm,
    options: Partial<BackpropPluginOptions> = {}
  ) {
    this.algorithm = algorithm
    this.options = {
      ...defaultBackpropPluginOptions,
      ...options,
    } as Required<BackpropPluginOptions>
  }

  initialize(context: PluginContext): void {
    if (!isSupervisedEnvironment(context.environment)) {
      throw new Error(
        'BackpropPlugin requires an environment that implements SupervisedEnvironment'
      )
    }
    this.supervisedEnvironment = context.environment
  }

  async evaluateGenome(
    genome: G,
    _defaultEvaluate: (genome: G) => Promise<number>,
    context: EvaluationContext<G>
  ): Promise<EvaluationResult> {
    if (context.supportsTraining) {
      return this.evaluateWorker(genome, context)
    }
    return this.evaluateLocal(genome)
  }

  afterFitness(genome: G, _fitness: number, _context: PluginContext): void {
    const updatedActions = this.pendingWritebacks.get(genome)
    if (updatedActions) {
      this.algorithm.writeBackWeights(genome, updatedActions)
      this.pendingWritebacks.delete(genome)
    }
  }

  // BackpropPlugin does not provide context hooks — it replaces evaluation entirely.

  private async evaluateWorker(
    genome: G,
    context: EvaluationContext<G>
  ): Promise<EvaluationResult> {
    const { trainingEpochs, learningRate, isLamarckian } = this.options

    const result = await context.call<TrainGenomeResult>(
      requestTrainGenome({
        genomeOptions: genome.toFactoryOptions(),
        trainingEpochs,
        learningRate,
        isLamarckian,
      })
    )

    if (isLamarckian && result.updatedActions) {
      this.pendingWritebacks.set(genome, result.updatedActions)
    }

    return { fitness: result.fitness }
  }

  private evaluateLocal(genome: G): EvaluationResult {
    if (this.supervisedEnvironment == null) {
      throw new Error(
        'BackpropPlugin not initialized — call initialize() first'
      )
    }

    const { trainingEpochs, learningRate, isLamarckian } = this.options
    const phenotype = this.algorithm.createPhenotype(genome)
    const result = trainGenome(phenotype, this.supervisedEnvironment, {
      trainingEpochs,
      learningRate,
      isLamarckian,
    })

    if (isLamarckian && result.updatedActions) {
      this.pendingWritebacks.set(genome, result.updatedActions)
    }

    return { fitness: result.fitness }
  }
}
