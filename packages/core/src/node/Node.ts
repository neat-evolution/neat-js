import type { NodeConfig } from '../config/ExtendedConfig.js'
import type { NodeState } from '../state/ExtendedState.js'

import type { NodeFactory } from './NodeFactory.js'

export enum NodeType {
  Input = 'Input',
  Hidden = 'Hidden',
  Output = 'Output',
}

export interface NodeRef {
  id: number
  type: NodeType
  toJSON?: () => Omit<NodeRef, 'toJSON'>
}

export interface NodeData<C extends NodeConfig, S extends NodeState>
  extends Omit<NodeRef, 'toJSON'> {
  config: C
  state: S
}

export interface NodeExtension<
  C extends NodeConfig,
  S extends NodeState,
  N extends NodeExtension<C, S, N>
> extends NodeRef {
  config: C
  state: S

  createNode: NodeFactory<C, S, N>
  neat: () => Node<C, S>
  crossover: (other: N, fitness: number, otherFitness: number) => N
  distance: (other: N) => number
}

export class Node<C extends NodeConfig, S extends NodeState>
  implements NodeExtension<C, S, Node<C, S>>
{
  public readonly id: number
  public readonly type: NodeType
  public readonly config: C
  public readonly state: S
  public readonly createNode: NodeFactory<C, S, Node<C, S>>

  constructor(
    type: NodeType,
    id: number,
    config: C,
    state: S,
    createNode: NodeFactory<C, S, Node<C, S>>
  ) {
    this.id = id
    this.type = type
    this.config = config
    this.state = state
    this.createNode = createNode
  }

  public neat(): Node<C, S> {
    return this
  }

  crossover(
    other: Node<C, S>,
    _fitness: number,
    _otherFitness: number
  ): Node<C, S> {
    if (this.type !== other.type || this.id !== other.id) {
      throw new Error('Mismatch in crossover')
    }
    return this.createNode(this.type, this.id, this.config, this.state)
  }

  distance(_other: Node<C, S>): number {
    return 0
  }

  toString(): string {
    return toNodeKey(this.type, this.id)
  }

  toJSON(): NodeData<C, S> {
    return {
      type: this.type,
      id: this.id,
      config: this.config,
      state: this.state,
    }
  }
}

export const nodeRefToKey = (nodeRef: NodeRef): string => {
  return toNodeKey(nodeRef.type, nodeRef.id)
}

export const toNodeKey = (type: NodeRef['type'], id: NodeRef['id']): string => {
  return `${type}[${id}]`
}

export const compareNodeRef = (a: NodeRef, b: NodeRef): number => {
  if (a.type === b.type) {
    switch (a.type) {
      case NodeType.Input:
        return a.id - b.id
      case NodeType.Hidden:
        return a.id - b.id
      case NodeType.Output:
        return a.id - b.id
    }
  } else {
    const order = [NodeType.Input, NodeType.Hidden, NodeType.Output]
    return order.indexOf(a.type) - order.indexOf(b.type)
  }
}
