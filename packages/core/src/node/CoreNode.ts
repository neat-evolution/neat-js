import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type {
  ConfigNodeOptionsOf,
  NodeFactoryOptionsOf,
  NodeTypeOf,
  StateNodeDataOf,
  StateNodeOf,
} from '../contexts/helpers.js'

import type { Node } from './Node.js'
import type { NodeData } from './NodeData.js'
import type { NodeFactory } from './NodeFactory.js'
import type { NodeId } from './NodeRef.js'
import type { NodeType } from './NodeType.js'
import { toNodeKey } from './nodeRefToKey.js'

export class CoreNode<Ctx extends AlgorithmContext = AlgorithmContext>
  implements Node<Ctx>
{
  // NodeRef
  public readonly type: NodeType
  public readonly id: NodeId

  // NodeExtension
  public readonly config: ConfigNodeOptionsOf<Ctx>
  public readonly state: StateNodeOf<Ctx>

  // NodeFactory
  public readonly createNode: NodeFactory<Ctx>

  constructor(
    factoryOptions: NodeFactoryOptionsOf<Ctx>,
    config: ConfigNodeOptionsOf<Ctx>,
    state: StateNodeOf<Ctx>,
    createNode: NodeFactory<Ctx>
  ) {
    this.type = factoryOptions.type
    this.id = factoryOptions.id
    this.config = config
    this.state = state
    this.createNode = createNode
  }

  crossover(
    other: NodeTypeOf<Ctx>,
    _fitness: number,
    _otherFitness: number
  ): NodeTypeOf<Ctx> {
    if (this.type !== other.type || this.id !== other.id) {
      throw new Error('Mismatch in crossover')
    }
    return this.createNode(this.toFactoryOptions(), this.config, this.state)
  }

  clone(): NodeTypeOf<Ctx> {
    return this.createNode(this.toFactoryOptions(), this.config, this.state)
  }

  distance(_other: NodeTypeOf<Ctx>): number {
    return 0
  }

  toString(): string {
    return String(toNodeKey(this.type, this.id))
  }

  /**
   * Must override
   * @returns node data
   */
  toJSON(): NodeData<
    NodeFactoryOptionsOf<Ctx>,
    ConfigNodeOptionsOf<Ctx>,
    StateNodeDataOf<Ctx>
  > {
    return {
      config: this.config,
      state: this.state?.toJSON() ?? null,
      factoryOptions: this.toFactoryOptions(),
    } as NodeData<
      NodeFactoryOptionsOf<Ctx>,
      ConfigNodeOptionsOf<Ctx>,
      StateNodeDataOf<Ctx>
    >
  }

  /**
   * Must override
   * @returns node factory options
   */
  toFactoryOptions(): NodeFactoryOptionsOf<Ctx> {
    return { type: this.type, id: this.id } as NodeFactoryOptionsOf<Ctx>
  }
}
