import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { ExtendedState } from '../state/StateProvider.js'

import type { Node } from './Node.js'
import type { NodeData } from './NodeData.js'
import type { NodeFactory } from './NodeFactory.js'
import type { NodeFactoryOptions } from './NodeFactoryOptions.js'
import { toNodeKey } from './nodeRefToKey.js'
import type { NodeType } from './NodeType.js'

export class CoreNode<
  NFO extends NodeFactoryOptions,
  NCO extends ConfigOptions,
  NSD,
  NS extends ExtendedState<NSD>,
  N extends CoreNode<NFO, NCO, NSD, NS, N>
> implements Node<NFO, NCO, NSD, NS, N>
{
  // NodeRef
  public readonly type: NodeType
  public readonly id: number

  // NodeExtension
  public readonly config: NCO
  public readonly state: NS

  // NodeFactory
  public readonly createNode: NodeFactory<NFO, NCO, NSD, NS, N>

  constructor(
    factoryOptions: NFO,
    config: NCO,
    state: NS,
    createNode: NodeFactory<NFO, NCO, NSD, NS, N>
  ) {
    this.type = factoryOptions.type
    this.id = factoryOptions.id
    this.config = config
    this.state = state
    this.createNode = createNode
  }

  crossover(other: N, _fitness: number, _otherFitness: number): N {
    if (this.type !== other.type || this.id !== other.id) {
      throw new Error('Mismatch in crossover')
    }
    return this.createNode(this.toFactoryOptions(), this.config, this.state)
  }

  clone(): N {
    return this.createNode(this.toFactoryOptions(), this.config, this.state)
  }

  distance(_other: N): number {
    return 0
  }

  toString(): string {
    return toNodeKey(this.type, this.id)
  }

  /**
   * Must override
   * @returns {NodeData<NFO, NCO, NSD>} node data
   */
  toJSON(): NodeData<NFO, NCO, NSD> {
    return {
      config: this.config,
      state: this.state?.toJSON() ?? null,
      factoryOptions: this.toFactoryOptions(),
    } as unknown as NodeData<NFO, NCO, NSD>
  }

  /**
   * Must override
   * @returns {NFO} node factory options
   */
  toFactoryOptions(): NFO {
    return { type: this.type, id: this.id } as unknown as NFO
  }
}
