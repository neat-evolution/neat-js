import type { EnvironmentRuntimeOptions } from '@neat-evolution/execution-manager'
import type { Environment } from './Environment.js'

export type EnvironmentFactory<EFO> = (
  options: EFO,
  runtimeOptions?: EnvironmentRuntimeOptions
) => Environment<EFO>
