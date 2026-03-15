import type { PhenotypeAction } from '@neat-evolution/core'
import type { StaticExecutor } from '../../Executor.js'

export interface TrainableExecutor extends StaticExecutor {
  forward(inputs: number[] | Float64Array): Float64Array
  backward(outputErrors: Float64Array, learningRate: number): void
  getUpdatedActions(): PhenotypeAction[]
}
