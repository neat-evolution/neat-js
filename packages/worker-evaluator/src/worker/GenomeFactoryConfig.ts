import type {
  ConfigProvider,
  GenomeOptions,
  InitConfig,
  StateProvider,
} from '@neat-evolution/core'

export interface GenomeFactoryConfig {
  configProvider: ConfigProvider
  stateProvider: StateProvider
  genomeOptions: GenomeOptions
  initConfig: InitConfig
}
