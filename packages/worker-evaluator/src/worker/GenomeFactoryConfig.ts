import type {
  ConfigProvider,
  GenomeOptions,
  InitConfig,
  StateProvider,
} from '@neat-evolution/core'

export interface GenomeFactoryConfig {
  configProvider: ConfigProvider<any, any, any>
  stateProvider: StateProvider<any, any, any, any, any>
  genomeOptions: GenomeOptions
  initConfig: InitConfig
}
