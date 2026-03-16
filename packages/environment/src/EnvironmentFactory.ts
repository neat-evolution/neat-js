import type { EnvironmentInitOptions } from '@neat-evolution/execution-manager'
import type { Environment } from './Environment.js'

export type EnvironmentFactory<EFO> = (
  options: EFO,
  initOptions?: EnvironmentInitOptions
) => Environment<EFO>
