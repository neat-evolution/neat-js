import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type {
  ConfigTypeOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  GenomeTypeOf,
  StateTypeOf,
} from '../contexts/helpers.js'
import type { InitConfig } from './InitConfig.js'

export type GenomeFactory<Ctx extends AlgorithmContext = AlgorithmContext> = (
  configProvider: ConfigTypeOf<Ctx>,
  stateProvider: StateTypeOf<Ctx>,
  genomeOptions: GenomeOptionsOf<Ctx>,
  initConfig: InitConfig,
  genomeFactoryOptions?: GenomeFactoryOptionsOf<Ctx>
) => GenomeTypeOf<Ctx>
