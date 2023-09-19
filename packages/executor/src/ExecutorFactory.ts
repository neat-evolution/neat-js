import type { Phenotype } from '@neat-js/phenotype'

import type { Executor } from './Executor.js'

export type ExecutorFactory = (
  phenotype: Phenotype,
  batchSize: number
) => Executor
