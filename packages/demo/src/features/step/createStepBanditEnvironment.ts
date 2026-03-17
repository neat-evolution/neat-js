import type { EnvironmentFactory } from '@neat-evolution/environment'
import {
  StepBanditEnvironment,
  type StepBanditFactoryOptions,
} from './StepBanditEnvironment.js'

export const createEnvironment: EnvironmentFactory<StepBanditFactoryOptions> = (
  options,
  initOptions
) => {
  return new StepBanditEnvironment(options?.outputCount, initOptions)
}
