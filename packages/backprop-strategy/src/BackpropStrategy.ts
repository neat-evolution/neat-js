import type {
  AnyAlgorithm,
  AnyGenome,
  FitnessData,
  GenomeEntries,
} from '@neat-evolution/core'
import {
  isSupervisedEnvironment,
  type SupervisedEnvironment,
} from '@neat-evolution/environment'
import type {
  EvaluationContext,
  EvaluationStrategy,
} from '@neat-evolution/evaluation-strategy'

import { requestTrainGenome, type TrainGenomeResult } from './actions.js'
import { trainGenome } from './trainGenome.js'

export interface BackpropStrategyOptions {
  trainingEpochs: number
  learningRate: number
  /** Write trained weights back to genome. Default: true (Lamarckian). */
  isLamarckian?: boolean
}

const defaultBackpropStrategyOptions: BackpropStrategyOptions = {
  trainingEpochs: 10,
  learningRate: 0.01,
  isLamarckian: true,
}

/**
 * @deprecated Prefer BackpropPlugin via the evaluation plugin pipeline.
 * BackpropStrategy remains for legacy callers that still configure strategies directly.
 */
export class BackpropStrategy<G extends AnyGenome = AnyGenome>
  implements EvaluationStrategy<G>
{
  private readonly algorithm: AnyAlgorithm
  private readonly supervisedEnvironment: SupervisedEnvironment
  private readonly options: Required<BackpropStrategyOptions>

  constructor(
    algorithm: AnyAlgorithm,
    environment: unknown,
    options: Partial<BackpropStrategyOptions> = {}
  ) {
    if (!isSupervisedEnvironment(environment)) {
      throw new Error(
        'BackpropStrategy requires an environment that implements SupervisedEnvironment'
      )
    }
    this.algorithm = algorithm
    this.supervisedEnvironment = environment
    this.options = {
      ...defaultBackpropStrategyOptions,
      ...options,
    } as Required<BackpropStrategyOptions>
  }

  async *evaluate(
    context: EvaluationContext<G>,
    genomeEntries: GenomeEntries<G>
  ): AsyncIterable<FitnessData> {
    if (context.supportsTraining) {
      yield* this.evaluateWorker(context, genomeEntries)
    } else {
      yield* this.evaluateLocal(genomeEntries)
    }
  }

  private async *evaluateWorker(
    context: EvaluationContext<G>,
    genomeEntries: GenomeEntries<G>
  ): AsyncIterable<FitnessData> {
    const promises: Array<Promise<FitnessData>> = []

    for (const entry of genomeEntries) {
      const [speciesIndex, organismIndex, genome] = entry
      const { trainingEpochs, learningRate, isLamarckian } = this.options

      // One call per genome: training + fitness scoring combined.
      // genomeOptions sent once, result contains only fitness + optional updatedActions.
      const promise = context
        .call<TrainGenomeResult>(
          requestTrainGenome({
            genomeOptions: genome.toFactoryOptions(),
            trainingEpochs,
            learningRate,
            isLamarckian,
          })
        )
        .then((result): FitnessData => {
          // Writeback on main thread — genome object lives here
          if (isLamarckian && result.updatedActions) {
            this.algorithm.writeBackWeights(genome, result.updatedActions)
          }
          return [speciesIndex, organismIndex, result.fitness]
        })

      promises.push(promise)
    }

    for (const p of promises) {
      yield await p
    }
  }

  private async *evaluateLocal(
    genomeEntries: GenomeEntries<G>
  ): AsyncIterable<FitnessData> {
    for (const entry of genomeEntries) {
      const [speciesIndex, organismIndex, genome] = entry
      const phenotype = this.algorithm.createPhenotype(genome)
      const result = trainGenome(
        phenotype,
        this.supervisedEnvironment,
        this.options
      )

      if (this.options.isLamarckian && result.updatedActions) {
        this.algorithm.writeBackWeights(genome, result.updatedActions)
      }

      yield [speciesIndex, organismIndex, result.fitness]
    }
  }
}
