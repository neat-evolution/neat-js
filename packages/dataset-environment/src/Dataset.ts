import type { InitConfig } from '@neat-evolution/core'

export type Dimensions = InitConfig

export interface Dataset {
  dimensions: Dimensions
  isClassification: boolean
  oneHotOutput: boolean

  trainingInputs: number[][]
  trainingTargets: number[][]
  validationInputs: number[][]
  validationTargets: number[][]
  testInputs: number[][]
  testTargets: number[][]

  totalCount: number
  trainingCount: number
  validationCount: number
  testCount: number
}
