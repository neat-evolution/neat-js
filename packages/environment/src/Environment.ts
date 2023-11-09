import type { InitConfig } from '@neat-evolution/core'
import type { Executor } from '@neat-evolution/executor'

export type EnvironmentDescription = InitConfig

export interface Environment {
  description: EnvironmentDescription
  batchSize: number
  evaluate: (executor: Executor) => Promise<number>
  serialize?: () => SharedArrayBuffer
}
