import type {
  AnyAlgorithm,
  AnyGenome,
  FitnessData,
  GenomeEntries,
  GenomeEntry,
} from '@neat-evolution/core'
import {
  isSupervisedEnvironment,
  type SupervisedEnvironment,
} from '@neat-evolution/environment'
import type {
  EvaluationContext,
  EvaluationStrategy,
} from '@neat-evolution/evaluation-strategy'

import { createTrainableExecutor } from './createTrainableExecutor.js'

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
    _context: EvaluationContext<G>,
    genomeEntries: GenomeEntries<G>
  ): AsyncIterable<FitnessData> {
    for (const entry of genomeEntries) {
      yield this.trainAndEvaluate(entry)
    }
  }

  private trainAndEvaluate(entry: GenomeEntry<G>): FitnessData {
    const [speciesIndex, organismIndex, genome] = entry
    const phenotype = this.algorithm.createPhenotype(genome)
    const trainable = createTrainableExecutor(phenotype)

    const { trainingEpochs, learningRate } = this.options
    const training = this.supervisedEnvironment.getTrainingData()

    // Train on the training split
    for (let epoch = 0; epoch < trainingEpochs; epoch++) {
      for (let s = 0; s < training.count; s++) {
        const input = training.inputs[s]!
        const target = training.targets[s]!
        const output = trainable.forward(input)
        const errors = new Float64Array(output.length)
        for (let j = 0; j < output.length; j++) {
          errors[j] = (output[j] as number) - (target[j] as number)
        }
        trainable.backward(errors, learningRate)
      }
    }

    // Lamarckian writeback
    if (this.options.isLamarckian) {
      this.algorithm.writeBackWeights(genome, trainable.getUpdatedActions())
    }

    // Score fitness on the validation split
    const validation = this.supervisedEnvironment.getValidationData()
    const predictions = validation.inputs.map((input) =>
      trainable.forward(input)
    )
    const fitness = this.supervisedEnvironment.computeFitness(
      validation.targets,
      predictions
    )

    return [speciesIndex, organismIndex, fitness]
  }
}
