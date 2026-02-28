import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type {
  ConfigNodeOptionsOf,
  NodeFactoryOptionsOf,
  NodeTypeOf,
  StateNodeDataOf,
  StateNodeOf,
} from '../contexts/helpers.js'
import type { NodeData } from './NodeData.js'
import type { NodeFactory } from './NodeFactory.js'
import type { NodeRef } from './NodeRef.js'

export interface Node<Ctx extends AlgorithmContext> extends NodeRef {
  // NodeExtension
  config: ConfigNodeOptionsOf<Ctx>
  state: StateNodeOf<Ctx>

  // NodeFactory
  createNode: NodeFactory<Ctx>

  crossover: (
    other: NodeTypeOf<Ctx>,
    fitness: number,
    otherFitness: number
  ) => NodeTypeOf<Ctx>
  clone: () => NodeTypeOf<Ctx>
  distance: (other: NodeTypeOf<Ctx>) => number
  toJSON: () => NodeData<
    NodeFactoryOptionsOf<Ctx>,
    ConfigNodeOptionsOf<Ctx>,
    StateNodeDataOf<Ctx>
  >
  toFactoryOptions: () => NodeFactoryOptionsOf<Ctx>
}
