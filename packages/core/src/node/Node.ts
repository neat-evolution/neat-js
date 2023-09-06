import type { NodeConfig } from '../config/ExtendedConfig.js'
import type { NodeState } from '../state/ExtendedState.js'

import { type NodeType, type NodeData } from './NodeData.js'
import type { NodeExtension } from './NodeExtension.js'
import type { NodeFactory, NodeFactoryOptions } from './NodeFactory.js'
import { toNodeKey } from './nodeRefToKey.js'

export class Node<
  NC extends NodeConfig,
  NS extends NodeState,
  N extends NodeExtension<NC, NS, N>
> implements NodeExtension<NC, NS, N>
{
  public readonly id: number
  public readonly type: NodeType
  public readonly config: NC
  public readonly state: NS
  public readonly createNode: NodeFactory<NC, NS, N>

  constructor(
    type: NodeType,
    id: number,
    config: NC,
    state: NS,
    createNode: NodeFactory<NC, NS, N>
  ) {
    this.id = id
    this.type = type
    this.config = config
    this.state = state
    this.createNode = createNode
  }

  public neat(): Node<NC, NS, N> {
    return this
  }

  crossover(other: N, _fitness: number, _otherFitness: number): N {
    if (this.type !== other.type || this.id !== other.id) {
      throw new Error('Mismatch in crossover')
    }
    return this.createNode(this.type, this.id, this.config, this.state)
  }

  distance(_other: N): number {
    return 0
  }

  toString(): string {
    return toNodeKey(this.type, this.id)
  }

  toJSON(): NodeData<NC, NS> {
    return {
      type: this.type,
      id: this.id,
      // FIXME: this.config.toFactoryOptions()
      config: this.config,
      // FIXME: this.state.toFactoryOptions()
      state: this.state,
    }
  }

  toFactoryOptions(): NodeFactoryOptions<NC, NS> {
    return {
      type: this.type,
      id: this.id,
    }
  }
}
