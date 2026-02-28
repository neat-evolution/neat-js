import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type {
  ConfigFactoryOptionsOf,
  ConfigTypeOf,
} from '../contexts/helpers.js'

export type ConfigFactory<Ctx extends AlgorithmContext> = (
  factoryOptions: ConfigFactoryOptionsOf<Ctx>
) => ConfigTypeOf<Ctx>
