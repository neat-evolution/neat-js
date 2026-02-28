import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type {
  ConfigLinkOptionsOf,
  LinkFactoryOptionsOf,
  LinkTypeOf,
  StateLinkOf,
} from '../contexts/helpers.js'

import type { LinkFactoryOptions } from './LinkFactoryOptions.js'

export interface LinkFactory<Ctx extends AlgorithmContext> {
  (
    factoryOptions: LinkFactoryOptions,
    config: ConfigLinkOptionsOf<Ctx>,
    state: StateLinkOf<Ctx>
  ): LinkTypeOf<Ctx>
  (
    factoryOptions: LinkFactoryOptions & Partial<LinkFactoryOptionsOf<Ctx>>,
    config: ConfigLinkOptionsOf<Ctx>,
    state: StateLinkOf<Ctx>
  ): LinkTypeOf<Ctx>
}
