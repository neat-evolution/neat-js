export interface TrainingData {
  inputs: ReadonlyArray<number[] | Float64Array>
  targets: ReadonlyArray<number[] | Float64Array>
  count: number
}

export interface LossConfig {
  isClassification: boolean
  oneHotOutput: boolean
}
