import type { Phenotype } from '@neat-evolution/core'

import type { AsyncExecutor, SyncExecutor } from './Executor.js'

export type ExecutorFactory = SyncExecutorFactory | AsyncExecutorFactory

export type SyncExecutorFactory = (phenotype: Phenotype) => SyncExecutor
export type AsyncExecutorFactory = (phenotype: Phenotype) => AsyncExecutor
