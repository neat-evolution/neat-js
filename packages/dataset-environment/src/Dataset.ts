import type { InitConfig } from '@neat-evolution/core'

import type { Matrix } from './types.js'

export type Dimensions = InitConfig

export interface Dataset {
  dimensions: Dimensions
  isClassification: boolean
  oneHotOutput: boolean

  trainingInputs: Matrix
  trainingTargets: Matrix
  validationInputs: Matrix
  validationTargets: Matrix
  testInputs: Matrix
  testTargets: Matrix

  totalCount: number
  trainingCount: number
  validationCount: number
  testCount: number
}
