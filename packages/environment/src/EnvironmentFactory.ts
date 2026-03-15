import type { Environment } from './Environment.js'
import type { EnvironmentRuntimeOptions } from './EnvironmentRuntimeOptions.js'

export type EnvironmentFactory<EFO> = (
  options: EFO,
  runtimeOptions?: EnvironmentRuntimeOptions
) => Environment<EFO>
