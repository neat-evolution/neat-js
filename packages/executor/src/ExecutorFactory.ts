import type { Phenotype } from '@neat-js/core'

import type { Executor } from './Executor.js'

export type ExecutorFactory = (
  phenotype: Phenotype,
  batchSize: number
) => Executor
