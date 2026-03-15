import type { PhenotypeAction } from '@neat-evolution/core'
import type { StaticExecutor } from '@neat-evolution/executor'

export interface TrainableExecutor extends StaticExecutor {
  forward(inputs: number[] | Float64Array): Float64Array
  backward(outputErrors: Float64Array, learningRate: number): void
  getUpdatedActions(): PhenotypeAction[]
}
