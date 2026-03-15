import type { Phenotype } from '@neat-evolution/core'

import type { StaticExecutor } from './Executor.js'

export type ExecutorFactory = (phenotype: Phenotype) => StaticExecutor
