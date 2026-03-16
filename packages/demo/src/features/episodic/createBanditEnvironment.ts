import type { EnvironmentFactory } from '@neat-evolution/environment'

import {
  BanditEnvironment,
  type BanditFactoryOptions,
} from './BanditEnvironment.js'

export const createEnvironment: EnvironmentFactory<BanditFactoryOptions> = (
  options,
  initOptions
) => {
  return new BanditEnvironment(options?.outputCount, initOptions)
}
