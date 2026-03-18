import type { EnvironmentFactory } from '@neat-evolution/environment'
import {
  StepControlEnvironment,
  type StepControlFactoryOptions,
} from './StepControlEnvironment.js'

export const createEnvironment: EnvironmentFactory<
  StepControlFactoryOptions
> = (options, initOptions) => {
  return new StepControlEnvironment(options?.outputCount, initOptions)
}
