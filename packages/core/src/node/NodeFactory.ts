import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type {
  ConfigNodeOptionsOf,
  NodeFactoryOptionsOf,
  NodeTypeOf,
  StateNodeOf,
} from '../contexts/helpers.js'

import type { NodeFactoryOptions } from './NodeFactoryOptions.js'

export interface NodeFactory<Ctx extends AlgorithmContext> {
  (
    factoryOptions: NodeFactoryOptions,
    config: ConfigNodeOptionsOf<Ctx>,
    state: StateNodeOf<Ctx>
  ): NodeTypeOf<Ctx>
  (
    factoryOptions: NodeFactoryOptions & Partial<NodeFactoryOptionsOf<Ctx>>,
    config: ConfigNodeOptionsOf<Ctx>,
    state: StateNodeOf<Ctx>
  ): NodeTypeOf<Ctx>
}
