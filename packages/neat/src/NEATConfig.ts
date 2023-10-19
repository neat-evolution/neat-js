import {
  CoreConfig,
  type ConfigFactoryOptions,
  type ConfigData,
} from '@neat-js/core'

export class NEATConfig extends CoreConfig<
  ConfigFactoryOptions,
  null,
  null,
  ConfigData
> {
  override node() {
    return null
  }

  override link() {
    return null
  }

  override toJSON() {
    return { neat: this.neatConfig }
  }
}
