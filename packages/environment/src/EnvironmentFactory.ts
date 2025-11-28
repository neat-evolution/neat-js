import type { Environment } from './Environment.js'

export type EnvironmentFactory<EFO> = (options: EFO) => Environment<EFO>
