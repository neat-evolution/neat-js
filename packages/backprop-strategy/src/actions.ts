import type {
  GenomeFactoryOptions,
  PhenotypeAction,
} from '@neat-evolution/core'
import { createMessage } from '@neat-evolution/worker-actions'

export enum ActionType {
  REQUEST_TRAIN_GENOME = 'REQUEST_TRAIN_GENOME',
}

export interface TrainGenomePayload {
  genomeOptions: GenomeFactoryOptions
  trainingEpochs: number
  learningRate: number
  isLamarckian: boolean
}

export interface TrainGenomeResult {
  fitness: number
  /** Trained weights/biases. Present only when isLamarckian is true. */
  updatedActions?: PhenotypeAction[]
}

export const requestTrainGenome = createMessage<
  TrainGenomePayload,
  TrainGenomeResult
>(ActionType.REQUEST_TRAIN_GENOME)
