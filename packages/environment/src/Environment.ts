import type { InitConfig } from '@neat-evolution/core'
import type { Executor, SyncExecutor } from '@neat-evolution/executor'

export type EnvironmentDescription = InitConfig

export interface Environment<
  EFO,
  E extends SyncExecutor[],
  EA extends Executor[],
  ER,
> {
  description: EnvironmentDescription
  evaluate: (...args: E) => ER
  evaluateAsync: (...args: EA) => Promise<ER>
  toFactoryOptions: () => EFO
}

export type StandardEnvironment<EFO> = Environment<
  EFO,
  [executor: SyncExecutor],
  [executor: Executor],
  number
>
