import type { WritebackPayload } from '@neat-evolution/core'
import type { StaticExecutor } from '../../Executor.js'

export interface TrainableExecutor extends StaticExecutor {
  forward(inputs: number[] | Float64Array): Float64Array
  backward(outputErrors: Float64Array, learningRate: number): void
  getUpdatedActions(): WritebackPayload
  getWeightGradients(): Float64Array
  createSnapshot(): StaticExecutor

  /**
   * Compute gradients and ADD them to the existing gradient accumulator
   * without updating weights. Call `applyGradients()` after accumulating
   * across all samples to apply one coherent weight update.
   *
   * Used by CPPN chaining: forward+accumulate for each coordinate,
   * then applyGradients once per substrate backward step.
   */
  accumulateBackward(outputErrors: Float64Array): void

  /**
   * Apply accumulated gradients to weights/biases and zero the accumulator.
   * Typically called after one or more `accumulateBackward()` calls.
   */
  applyGradients(learningRate: number): void

  /** Zero the gradient accumulator without applying. */
  zeroGradients(): void
}
