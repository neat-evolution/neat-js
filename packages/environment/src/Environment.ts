import type { InitConfig } from '@neat-js/core'
import type { Executor } from '@neat-js/executor'

export type EnvironmentDescription = InitConfig

export interface Environment {
  description: EnvironmentDescription
  evaluate: (executor: Executor) => Promise<number>
  serialize?: () => SharedArrayBuffer
}
