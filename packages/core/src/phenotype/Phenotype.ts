import type { WritebackPayload } from '../WritebackPayload.js'
import type { PhenotypeAction } from './PhenotypeAction.js'
import type { PhenotypeCoordinateMap } from './PhenotypeCoordinateMap.js'

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

  /**
   * Called after `TrainableExecutor.backward()` computes substrate gradients.
   * Chains the gradient signal through to the underlying CPPN.
   * Set by HyperNEAT `createPhenotype` when Lamarckian training is enabled.
   */
  chainBackward?: (gradients: Float64Array, learningRate: number) => void

  /**
   * Called by `TrainableExecutor.getUpdatedActions()` to transform the writeback.
   * For HyperNEAT: returns the CPPN's updated actions instead of the substrate's.
   * Returns `undefined` if no backward was ever called (CPPN executor never created),
   * signaling fallback to normal substrate action extraction.
   */
  transformWriteback?: () => WritebackPayload | undefined

  /**
   * Coordinate metadata mapping substrate actions to CPPN query coordinates.
   * Populated by HyperNEAT `createPhenotype` when Lamarckian training is enabled.
   */
  coordinateMap?: PhenotypeCoordinateMap
}
