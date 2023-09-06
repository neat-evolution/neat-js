import { Config, type NEATConfigOptions } from '@neat-js/core'

export class NEATConfig extends Config<null, null> {
  constructor(configOptions: NEATConfigOptions) {
    super(configOptions, null, null)
  }
}
