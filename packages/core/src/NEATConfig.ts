import { Config } from './config/Config.js'
import type { NEATOptions } from './NEATOptions.js'

export class NEATConfig extends Config<null, null> {
  constructor(options: Partial<NEATOptions> = {}) {
    super(options, null, null)
  }
}
