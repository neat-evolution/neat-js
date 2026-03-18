import type { PhenotypeAction } from './PhenotypeAction.js'

export interface Phenotype {
  length: number
  inputs: number[]
  outputs: number[]
  actions: PhenotypeAction[]
  /**
   * Whether biases are trainable during backprop. When false,
   * `TrainableExecutor.backward()` skips bias updates.
   *
   * Algorithms that cannot write back biases (e.g. NEAT, DES-HyperNEAT)
   * set this to false so training does not learn biases that would be
   * discarded on writeback.
   *
   * @default true
   */
  trainableBiases?: boolean
}
