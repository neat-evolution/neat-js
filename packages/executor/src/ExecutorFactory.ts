import type { Phenotype } from '@neat-evolution/core'

import type { Executor } from './Executor.js'

export type ExecutorFactory = (
  phenotype: Phenotype,
  batchSize: number
) => Executor
