import type { NodeRef } from '../node/NodeData.js'
import { nodeRefToKey, type NodeKey } from '../node/nodeRefToKey.js'

/** weight */
export type Edge = number

export type Connection<N extends NodeRef, E extends Edge> = [
  from: N,
  to: N,
  /** weight */
  edge: E
]

export interface Target<N extends NodeRef, E extends Edge> {
  /** to */
  node: N
  /** weight */
  edge: E
}

export interface ConnectionInfo<N extends NodeRef, E extends Edge> {
  /** source */
  node: N
  targets: Array<Target<N, E>>
}

export type ConnectionData = [from: NodeKey, to: NodeKey, edge: Edge]

export interface ConnectionsData {
  nodes: Record<NodeKey, NodeRef>
  connections: ConnectionData[]
}

export type ActionEdge = Connection<NodeRef, Edge>
export type ActionNode = [nodeRef: NodeRef]
export type Action = ActionEdge | ActionNode

export const isActionEdge = (action: Action): action is ActionEdge => {
  return (action as ActionEdge).length === 3
}

export const isActionNode = (action: Action): action is ActionNode => {
  return (action as ActionNode).length === 1
}

export class Connections<N extends NodeRef = NodeRef, E extends Edge = Edge> {
  private readonly connectionMap: Map<NodeKey, ConnectionInfo<N, E>>

  constructor() {
    this.connectionMap = new Map<NodeKey, ConnectionInfo<N, E>>()
  }

  add(from: N, to: N, edge: E, isSafe?: boolean): void {
    // Sometimes we already know that the connection is safe
    const knownNotToCreateCycle = isSafe ?? !this.createsCycle(from, to)
    if (!knownNotToCreateCycle) {
      throw new Error('cannot add link that creates cycle')
    }
    if (this.hasConnection(from, to)) {
      throw new Error('cannot add existing connection')
    }
    const fromKey = nodeRefToKey(from)
    const info = this.connectionMap.get(fromKey)

    const target = { node: to, edge }
    if (info !== undefined) {
      info.targets.push(target)
    } else {
      this.connectionMap.set(fromKey, {
        node: from,
        targets: [target],
      })
    }
  }

  setEdge(from: N, to: N, edge: E) {
    const data = this.connectionMap.get(nodeRefToKey(from))
    if (data === undefined) {
      throw new Error('cannot set non-existent edge')
    }
    const toKey = nodeRefToKey(to)
    const target = data.targets.find(({ node: t }) => nodeRefToKey(t) === toKey)
    if (target === undefined) {
      throw new Error('cannot set non-existent edge')
    }
    target.edge = edge
  }

  getEdge(from: N, to: N): E {
    const data = this.connectionMap.get(nodeRefToKey(from))
    if (data === undefined) {
      throw new Error('cannot get non-existent edge')
    }
    const toKey = nodeRefToKey(to)
    const target = data.targets.find(({ node: t }) => nodeRefToKey(t) === toKey)
    if (target === undefined) {
      throw new Error('cannot get non-existent edge')
    }
    return target.edge
  }

  /**
   * Get all connections (fast)
   * @yields {Connection<N, E>} connection
   */
  *connections(): Generator<Connection<N, E>, void, undefined> {
    for (const { node: source, targets } of this.connectionMap.values()) {
      for (const { node: target, edge } of targets) {
        yield [source, target, edge]
      }
    }
  }

  /**
   * Get all nodes
   * @yields {N} node
   */
  *nodes(): Generator<N, void, undefined> {
    const uniqueNodes = new Set<NodeKey>()
    for (const { node: source, targets } of this.connectionMap.values()) {
      for (const { node: target } of targets) {
        if (!uniqueNodes.has(nodeRefToKey(source))) {
          yield source
          uniqueNodes.add(nodeRefToKey(source))
        }

        if (!uniqueNodes.has(nodeRefToKey(target))) {
          yield target
          uniqueNodes.add(nodeRefToKey(target))
        }
      }
    }
  }

  getTargetsLength(from: N): number {
    return this.connectionMap.get(nodeRefToKey(from))?.targets.length ?? 0
  }

  getTargets(from: N): Array<Target<N, E>> {
    return this.connectionMap.get(nodeRefToKey(from))?.targets ?? []
  }

  hasConnection(from: N, to: N): boolean {
    const toKey = nodeRefToKey(to)
    for (const { node: target } of this.getTargets(from)) {
      if (nodeRefToKey(target) === toKey) {
        return true
      }
    }
    return false
  }

  hasNode(node: N): boolean {
    const nodeKey = nodeRefToKey(node)
    for (const existingNode of this.nodes()) {
      if (nodeRefToKey(existingNode) === nodeKey) {
        return true
      }
    }
    return false
  }

  delete(from: N, to: N): E {
    const fromKey = nodeRefToKey(from)
    const toKey = nodeRefToKey(to)
    const info = this.connectionMap.get(fromKey)
    if (info == null) {
      throw new Error('cannot remove non-existent connection')
    }
    const targets = info.targets

    if (targets == null) {
      throw new Error('cannot remove non-existent connection')
    }

    if (targets.length === 1) {
      const target = targets[0] as Target<N, E>
      if (nodeRefToKey(target.node) !== toKey) {
        throw new Error('cannot remove non-existent connection')
      }
      const edge = target.edge
      this.connectionMap.delete(fromKey)
      return edge
    } else {
      let index = -1
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i] as Target<N, E>
        if (nodeRefToKey(target.node) === toKey) {
          index = i
          break
        }
      }

      if (index === -1) {
        throw new Error('cannot remove non-existent connection')
      }

      // swap_remove equivalent
      const lastIdx = targets.length - 1
      const removed = targets[index] as Target<N, E>
      targets[index] = targets[lastIdx] as Target<N, E>
      targets.pop() as Target<N, E>

      return removed.edge
    }
  }

  deleteNode(node: N): Array<Connection<N, E>> {
    const nodeKey = nodeRefToKey(node)

    // Removed outgoing
    const removedConnections: Array<Connection<N, E>> = []
    if (this.connectionMap.has(nodeKey)) {
      const targets = this.getTargets(node)
      for (const target of targets) {
        removedConnections.push([node, target.node, target.edge])
      }
      this.connectionMap.delete(nodeKey)
    }

    // Remove inbound
    const deleteKeys: NodeKey[] = []

    for (const { node: source, targets } of this.connectionMap.values()) {
      const index = targets.findIndex(
        (target) => nodeRefToKey(target.node) === nodeKey
      )
      if (index !== -1) {
        const [target] = targets.splice(index, 1) as [target: Target<N, E>]
        removedConnections.push([source, node, target.edge])
        if (targets.length === 0) {
          deleteKeys.push(nodeRefToKey(source))
        }
      }
    }

    for (const sourceKey of deleteKeys) {
      this.connectionMap.delete(sourceKey)
    }

    return removedConnections
  }

  /// BFS search to check for cycles.
  ///
  /// If 'from' is reachable from 'to', then addition will cause cycle
  createsCycle(from: N, to: N): boolean {
    const visited = new Set<string>([nodeRefToKey(to)])
    const queue: N[] = [to]

    let front = 0

    while (front < queue.length) {
      const source = queue[front] as N
      front++

      if (nodeRefToKey(source) === nodeRefToKey(from)) {
        return true
      }

      for (const { node: target } of this.getTargets(source)) {
        if (!visited.has(nodeRefToKey(target))) {
          visited.add(nodeRefToKey(target))
          queue.push(target)
        }
      }
    }

    return false
  }

  toJSON(): ConnectionsData {
    const nodes: Record<NodeKey, NodeRef> = {}
    const connections: ConnectionData[] = []

    for (const [from, to, edge] of this.connections()) {
      const fromKey = nodeRefToKey(from)
      const toKey = nodeRefToKey(to)
      if (nodes[fromKey] === undefined) {
        nodes[fromKey] = { type: from.type, id: from.id }
      }
      if (nodes[toKey] === undefined) {
        nodes[toKey] = { type: to.type, id: to.id }
      }
      connections.push([fromKey, toKey, edge])
    }

    return {
      nodes,
      connections,
    }
  }

  *sortTopologically(): Generator<Action, void, undefined> {
    // Store number of incoming connections for all nodes
    const backwardCount = new Map<NodeKey, number>()

    for (const info of this.connectionMap.values()) {
      for (const target of info.targets) {
        const count = backwardCount.get(nodeRefToKey(target.node)) ?? 0
        backwardCount.set(nodeRefToKey(target.node), count + 1)
      }
    }

    // Initialize stack with nodes that have no incoming connections
    const stack: N[] = []
    const sortedKeys = Array.from(this.connectionMap.keys()).sort((a, b) => {
      const aType = a.startsWith('I') ? 0 : a.startsWith('O') ? 2 : 1
      const bType = b.startsWith('I') ? 0 : b.startsWith('O') ? 2 : 1
      const aId = Number(a.split('[')[1]?.split(']')[0])
      const bId = Number(a.split('[')[1]?.split(']')[0])
      if (aType === bType) {
        return aId - bId
      }
      return aType - bType
    })
    for (const nodeKey of sortedKeys) {
      if ((backwardCount.get(nodeKey) ?? 0) === 0) {
        const node = this.connectionMap.get(nodeKey)?.node
        if (node == null) {
          throw new Error('cannot find node')
        }
        stack.push(node)
      }
    }

    // Create topological order
    while (stack.length > 0) {
      const node = stack.pop() as N
      yield [node]

      // Process all outgoing connections from the current node
      for (const target of this.getTargets(node)) {
        yield [node, target.node, target.edge]

        // Reduce backward count by 1
        const targetKey = nodeRefToKey(target.node)
        const count = backwardCount.get(targetKey)
        if (count == null) {
          throw new Error('cannot find count')
        }
        backwardCount.set(targetKey, count - 1)

        // Add nodes with no incoming connections to the stack
        if (backwardCount.get(targetKey) === 0) {
          stack.push(target.node)
        }
      }
    }
  }
}
