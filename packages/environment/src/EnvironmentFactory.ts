import type { Environment } from './Environment.js'

export type EnvironmentFactory = (
  environmentData: SharedArrayBuffer | null
) => Environment
