import { toLinkKey, type LinkKey } from './link/linkRefToKey.js'
import type { NodeKey } from './node/nodeRefToKey.js'

/** weight for phenotype, null for substrate */
export type Edge = number | null

export type Connection<N extends NodeKey, E extends Edge> = [
  from: N,
  to: N,
  /** weight for phenotype, null for substrate */
  edge: E
]

export interface Target<N extends NodeKey, E extends Edge> {
  /** to */
  node: N
  /** weight for phenotype, null for substrate */
  edge: E
}

export interface ConnectionInfo<N extends NodeKey, E extends Edge> {
  /** source */
  node: N
  targets: Array<Target<N, E>>
}

export type ConnectionData<N extends NodeKey, E extends Edge> = [
  from: N,
  to: N,
  /** weight for phenotype, null for substrate */
  edge: E
]

export interface ConnectionsData<N extends NodeKey, E extends Edge> {
  nodes: N[]
  connections: Array<ConnectionData<N, E>>
}

export type ActionEdge<N extends NodeKey, E extends Edge> = Connection<N, E>
export type ActionNode<N extends NodeKey> = [nodeKey: N]
export type Action<N extends NodeKey, E extends Edge> =
  | ActionEdge<N, E>
  | ActionNode<N>

export const isActionEdge = <N extends NodeKey, E extends Edge>(
  action: Action<N, E>
): action is ActionEdge<N, E> => {
  return action.length === 3
}

export const isActionNode = <N extends NodeKey, E extends Edge>(
  action: Action<N, E>
): action is ActionNode<N> => {
  return action.length === 1
}

export class Connections<N extends NodeKey, E extends Edge> {
  private readonly connectionMap: Map<NodeKey, ConnectionInfo<N, E>>

  private readonly nodeKeyCache = new Set<NodeKey>()
  private readonly linkKeyCache = new Set<LinkKey>()

  constructor() {
    this.connectionMap = new Map<NodeKey, ConnectionInfo<N, E>>()
  }

  rebuildNodeKeyCache() {
    this.nodeKeyCache.clear()
    for (const node of this.nodes()) {
      this.nodeKeyCache.add(node)
    }
  }

  rebuildLinkKeyCache() {
    this.linkKeyCache.clear()
    for (const [source, target] of this.connections()) {
      this.linkKeyCache.add(toLinkKey(source, target))
    }
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
    const info = this.connectionMap.get(from)

    const target = { node: to, edge }
    if (info !== undefined) {
      info.targets.push(target)
    } else {
      this.connectionMap.set(from, {
        node: from,
        targets: [target],
      })
    }
    this.nodeKeyCache.add(from)
    this.nodeKeyCache.add(to)
    this.linkKeyCache.add(toLinkKey(from, to))
  }

  setEdge(from: N, to: N, edge: E) {
    const data = this.connectionMap.get(from)
    if (data === undefined) {
      throw new Error('cannot set non-existent edge')
    }
    const target = data.targets.find(({ node: t }) => t === to)
    if (target === undefined) {
      throw new Error('cannot set non-existent edge')
    }
    target.edge = edge
  }

  getEdge(from: N, to: N): E {
    const data = this.connectionMap.get(from)
    if (data === undefined) {
      throw new Error('cannot get non-existent edge')
    }
    const target = data.targets.find(({ node: t }) => t === to)
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
      if (!uniqueNodes.has(source)) {
        yield source
        uniqueNodes.add(source)
      }
      for (const { node: target } of targets) {
        if (!uniqueNodes.has(target)) {
          yield target
          uniqueNodes.add(target)
        }
      }
    }
  }

  getTargetsLength(from: N): number {
    return this.connectionMap.get(from)?.targets.length ?? 0
  }

  getTargets(from: N): Array<Target<N, E>> {
    return this.connectionMap.get(from)?.targets ?? []
  }

  hasConnection(from: N, to: N): boolean {
    return this.linkKeyCache.has(toLinkKey(from, to))
  }

  hasNode(node: N): boolean {
    return this.nodeKeyCache.has(node)
  }

  delete(from: N, to: N): E {
    const info = this.connectionMap.get(from)
    if (info == null) {
      throw new Error('cannot remove non-existent connection')
    }
    const targets = info.targets

    if (targets == null) {
      throw new Error('cannot remove non-existent connection')
    }

    if (targets.length === 1) {
      const target = targets[0] as Target<N, E>
      if (target.node !== to) {
        throw new Error('cannot remove non-existent connection')
      }
      const edge = target.edge
      this.connectionMap.delete(from)

      this.rebuildNodeKeyCache()
      this.rebuildLinkKeyCache()
      return edge
    } else {
      let index = -1
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i] as Target<N, E>
        if (target.node === to) {
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

      this.rebuildNodeKeyCache()
      this.rebuildLinkKeyCache()
      return removed.edge
    }
  }

  deleteNode(node: N): Array<Connection<N, E>> {
    // Removed outgoing
    const removedConnections: Array<Connection<N, E>> = []
    if (this.connectionMap.has(node)) {
      const targets = this.getTargets(node)
      for (const target of targets) {
        removedConnections.push([node, target.node, target.edge])
      }
      this.connectionMap.delete(node)
    }

    // Remove inbound
    const deleteKeys: NodeKey[] = []

    for (const { node: source, targets } of this.connectionMap.values()) {
      const index = targets.findIndex((target) => target.node === node)
      if (index !== -1) {
        const [target] = targets.splice(index, 1) as [target: Target<N, E>]
        removedConnections.push([source, node, target.edge])
        if (targets.length === 0) {
          deleteKeys.push(source)
        }
      }
    }

    for (const sourceKey of deleteKeys) {
      this.connectionMap.delete(sourceKey)
    }

    this.rebuildNodeKeyCache()
    this.rebuildLinkKeyCache()
    return removedConnections
  }

  /// BFS search to check for cycles.
  ///
  /// If 'from' is reachable from 'to', then addition will cause cycle
  createsCycle(from: N, to: N): boolean {
    const visited = new Set<string>([to])
    const queue: N[] = [to]
    let front = 0

    while (front < queue.length) {
      const source = queue[front] as N
      front++

      if (source === from) {
        return true
      }

      for (const { node: target } of this.getTargets(source)) {
        if (!visited.has(target)) {
          visited.add(target)
          queue.push(target)
        }
      }
    }
    return false
  }

  // FIXME: is this used anywhere?
  toJSON(): ConnectionsData<N, E> {
    const nodes = new Set<N>()
    const connections: Array<ConnectionData<N, E>> = []

    for (const [from, to, edge] of this.connections()) {
      if (!nodes.has(from)) {
        nodes.add(from)
      }
      if (!nodes.has(to)) {
        nodes.add(to)
      }
      connections.push([from, to, edge])
    }

    return {
      nodes: Array.from(nodes),
      connections,
    }
  }

  *sortTopologically(): Generator<Action<N, E>, void, undefined> {
    // Store number of incoming connections for all nodes
    const backwardCount = new Map<NodeKey, number>()

    for (const info of this.connectionMap.values()) {
      for (const target of info.targets) {
        const count = backwardCount.get(target.node) ?? 0
        backwardCount.set(target.node, count + 1)
      }
    }

    // Initialize stack with nodes that have no incoming connections
    const stack: N[] = []
    for (const nodeKey of this.connectionMap.keys()) {
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
        const count = backwardCount.get(target.node) as number
        backwardCount.set(target.node, count - 1)

        // Add nodes with no incoming connections to the stack
        if (backwardCount.get(target.node) === 0) {
          stack.push(target.node)
        }
      }
    }
  }
}
