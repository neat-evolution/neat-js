import type { Executor, SyncExecutor } from '@neat-evolution/executor'

import type { Environment } from './Environment.js'

export type EnvironmentFactory<
  EFO,
  E extends SyncExecutor[],
  EA extends Executor[],
  ER
> = (options: EFO) => Environment<EFO, E, EA, ER>

export type StandardEnvironmentFactory<EFO> = EnvironmentFactory<
  EFO,
  [executor: SyncExecutor],
  [executor: Executor],
  number
>
