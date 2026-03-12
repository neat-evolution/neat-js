import type { PhenotypeAction } from '@neat-evolution/core'

export interface TrainableExecutor {
  /** Forward pass. Returns outputs and retains internal state for backward pass. */
  forward(inputs: number[] | Float64Array): Float64Array

  /** Backward pass given output error gradients. Updates weights and biases. */
  backward(outputErrors: Float64Array, learningRate: number): void

  /** Returns phenotype actions with current (trained) weights and biases. */
  getUpdatedActions(): PhenotypeAction[]
}
