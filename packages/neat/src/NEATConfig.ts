import {
  type ConfigData,
  type ConfigFactoryOptions,
  CoreConfig,
} from '@neat-evolution/core'

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
