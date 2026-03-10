import {
  type LinkKey,
  type LinkNodeKey,
  toLinkKey,
} from './link/linkRefToKey.js'

/** weight for phenotype, null for substrate */
export type Edge = number | null

export type Connection<N extends LinkNodeKey, E extends Edge> = [
  from: N,
  to: N,
  /** weight for phenotype, null for substrate */
  edge: E,
]

export interface Target<N extends LinkNodeKey, E extends Edge> {
  /** to */
  node: N
  /** weight for phenotype, null for substrate */
  edge: E
}

export interface ConnectionInfo<N extends LinkNodeKey, E extends Edge> {
  /** source */
  node: N
  targets: Array<Target<N, E>>
}

export type ActionEdge<N extends LinkNodeKey, E extends Edge> = Connection<N, E>
export type ActionNode<N extends LinkNodeKey> = [nodeKey: N]
export type Action<N extends LinkNodeKey, E extends Edge> =
  | ActionEdge<N, E>
  | ActionNode<N>

export const isActionEdge = <N extends LinkNodeKey, E extends Edge>(
  action: Action<N, E>
): action is ActionEdge<N, E> => {
  return action.length === 3
}

export const isActionNode = <N extends LinkNodeKey, E extends Edge>(
  action: Action<N, E>
): action is ActionNode<N> => {
  return action.length === 1
}

export class Connections<N extends LinkNodeKey, E extends Edge> {
  // Static pools for hot paths
  private static visitedPool = new Set<LinkNodeKey>()
  private static queuePool: LinkNodeKey[] = []

  private readonly connectionMap: Map<N, ConnectionInfo<N, E>>

  private readonly nodeKeyCache = new Set<N>()
  private readonly linkKeyCache = new Set<LinkKey>()

  constructor(factoryOptions?: Array<Connection<N, E>>) {
    this.connectionMap = new Map<N, ConnectionInfo<N, E>>()
    if (factoryOptions !== undefined) {
      for (const [from, to, edge] of factoryOptions) {
        this.add(from, to, edge, true)
      }
    }
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

  clear() {
    this.connectionMap.clear()
    this.nodeKeyCache.clear()
    this.linkKeyCache.clear()
  }

  add(from: N, to: N, edge: E, isSafe?: boolean): void {
    this.addWithKey(from, to, edge, toLinkKey(from, to), isSafe)
  }

  addWithKey(
    from: N,
    to: N,
    edge: E,
    linkKey: LinkKey,
    isSafe?: boolean
  ): void {
    // Sometimes we already know that the connection is safe
    const knownNotToCreateCycle = isSafe ?? !this.createsCycle(from, to)
    if (!knownNotToCreateCycle) {
      throw new Error('cannot add link that creates cycle')
    }

    if (this.linkKeyCache.has(linkKey)) {
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
    this.linkKeyCache.add(linkKey)
  }

  extend(other: Connections<N, E>) {
    for (const { node: source, targets } of other.connectionMap.values()) {
      for (const { node, edge } of targets) {
        this.add(source, node, edge)
      }
    }
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
    const uniqueNodes = new Set<N>()
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

  hasInbound(node: N): boolean {
    for (const info of this.connectionMap.values()) {
      const targets = info.targets
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i]
        if (target?.node === node) {
          return true
        }
      }
    }
    return false
  }

  delete(from: N, to: N): E {
    return this.deleteWithKey(from, to, toLinkKey(from, to))
  }

  deleteWithKey(from: N, to: N, linkKey: LinkKey): E {
    const info = this.connectionMap.get(from)
    if (info == null) {
      throw new Error('cannot remove non-existent connection')
    }
    const targets = info.targets

    if (targets == null) {
      throw new Error('cannot remove non-existent connection')
    }

    let removedEdge: E
    if (targets.length === 1) {
      const target = targets[0] as Target<N, E>
      if (target.node !== to) {
        throw new Error('cannot remove non-existent connection')
      }
      removedEdge = target.edge
      this.connectionMap.delete(from)
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
      removedEdge = removed.edge
      targets[index] = targets[lastIdx] as Target<N, E>
      targets.pop()
    }

    // Incremental cache update
    this.linkKeyCache.delete(linkKey)
    // Check if nodes should be removed from cache
    if (!this.connectionMap.has(from) && !this.hasInbound(from)) {
      this.nodeKeyCache.delete(from)
    }
    if (!this.connectionMap.has(to) && !this.hasInbound(to)) {
      this.nodeKeyCache.delete(to)
    }

    return removedEdge
  }

  deleteNode(node: N): Array<Connection<N, E>> {
    // Removed outgoing
    const removedConnections: Array<Connection<N, E>> = []
    if (this.connectionMap.has(node)) {
      const targets = this.getTargets(node)
      for (const target of targets) {
        removedConnections.push([node, target.node, target.edge])
        this.linkKeyCache.delete(toLinkKey(node, target.node))
      }
      this.connectionMap.delete(node)
    }

    // Remove inbound
    const deleteKeys: N[] = []

    for (const { node: source, targets } of this.connectionMap.values()) {
      const index = targets.findIndex((target) => target.node === node)
      if (index !== -1) {
        const [target] = targets.splice(index, 1) as [target: Target<N, E>]
        removedConnections.push([source, node, target.edge])
        this.linkKeyCache.delete(toLinkKey(source, node))
        if (targets.length === 0) {
          deleteKeys.push(source)
        }
      }
    }

    for (const sourceKey of deleteKeys) {
      this.connectionMap.delete(sourceKey)
    }

    // Incremental node cache update
    this.nodeKeyCache.delete(node)

    // After significant changes like deleteNode, it's safer to rebuild the cache
    this.rebuildNodeKeyCache()

    return removedConnections
  }

  /// BFS search to check for cycles.
  ///
  /// If 'from' is reachable from 'to', then addition will cause cycle
  createsCycle(from: N, to: N): boolean {
    const visited = Connections.visitedPool
    const queue = Connections.queuePool

    visited.clear()
    queue.length = 0

    visited.add(to)
    queue.push(to)
    let front = 0

    let found = false
    while (front < queue.length) {
      const source = queue[front] as N
      front++

      if (source === from) {
        found = true
        break
      }

      const info = this.connectionMap.get(source)
      if (info !== undefined) {
        const targets = info.targets
        for (let i = 0; i < targets.length; i++) {
          const target = targets[i]?.node
          if (target == null) {
            continue
          }
          if (!visited.has(target)) {
            visited.add(target)
            queue.push(target)
          }
        }
      }
    }

    // Clear pool for next use
    visited.clear()
    queue.length = 0

    return found
  }

  sortTopologically(): Array<Action<N, E>> {
    // Store number of incoming connections for all nodes
    const backwardCount = new Map<N, number>()

    for (const info of this.connectionMap.values()) {
      for (const target of info.targets) {
        const count = backwardCount.get(target.node) ?? 0
        backwardCount.set(target.node, count + 1)
      }
    }

    // Initialize stack with nodes that have no incoming connections
    const stack: N[] = []
    for (const nodeKey of this.nodeKeyCache) {
      if ((backwardCount.get(nodeKey) ?? 0) === 0) {
        stack.push(nodeKey as N)
      }
    }

    const result: Array<Action<N, E>> = []
    // Create topological order
    while (stack.length > 0) {
      const node = stack.pop() as N
      result.push([node])

      const info = this.connectionMap.get(node)
      if (info !== undefined) {
        const targets = info.targets
        for (let i = 0; i < targets.length; i++) {
          const target = targets[i]
          if (target == null) {
            continue
          }
          result.push([node, target.node, target.edge])

          // Reduce backward count by 1
          const count = (backwardCount.get(target.node) ?? 0) - 1
          backwardCount.set(target.node, count)

          // Add nodes with no incoming connections to the stack
          if (count === 0) {
            stack.push(target.node)
          }
        }
      }
    }
    return result
  }

  prune(inputs: Set<N>, outputs: Set<N>, collect: boolean): Set<N> {
    const pruned = this.pruneDanglingInputs(inputs, collect)
    this.pruneDanglingOutputs(outputs, collect, pruned)
    this.rebuildNodeKeyCache()
    this.rebuildLinkKeyCache()
    return pruned
  }

  pruneDanglingInputs(
    inputs: Set<N>,
    collect: boolean,
    rebuildCache = false
  ): Set<N> {
    const backwardCount = new Map<N, number>()
    for (const { targets } of this.connectionMap.values()) {
      for (const target of targets) {
        backwardCount.set(
          target.node,
          (backwardCount.get(target.node) ?? 0) + 1
        )
      }
    }

    const pruned = new Set<N>()

    let done = false
    while (!done) {
      const danglingInputs: N[] = []
      for (const node of this.nodeKeyCache) {
        if (!inputs.has(node as N) && (backwardCount.get(node) ?? 0) === 0) {
          if (this.connectionMap.has(node as N)) {
            danglingInputs.push(node as N)
          }
        }
      }
      if (danglingInputs.length === 0) {
        done = true
      }
      for (const node of danglingInputs) {
        const targets = this.connectionMap.get(node)?.targets
        backwardCount.delete(node)
        this.connectionMap.delete(node)
        this.nodeKeyCache.delete(node)

        if (targets !== undefined) {
          for (const target of targets) {
            const count = backwardCount.get(target.node)
            if (count !== undefined) {
              backwardCount.set(target.node, count - 1)
              this.linkKeyCache.delete(toLinkKey(node, target.node))
            }
          }
        }
      }
      if (collect) {
        for (const danglingInput of danglingInputs) {
          pruned.add(danglingInput)
        }
      }
    }
    if (rebuildCache) {
      this.rebuildNodeKeyCache()
      this.rebuildLinkKeyCache()
    }
    return pruned
  }

  pruneDanglingOutputs(
    outputs: Set<N>,
    collect: boolean,
    prunedInputs?: Set<N>,
    rebuildCache = false
  ): Set<N> {
    const pruned = prunedInputs ?? new Set<N>()
    const inboundCount = new Map<N, number>()
    const inboundSources = new Map<N, N[]>()
    for (const [source, info] of this.connectionMap.entries()) {
      const targets = info.targets
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i]?.node
        if (target == null) {
          continue
        }
        inboundCount.set(target, (inboundCount.get(target) ?? 0) + 1)

        const sources = inboundSources.get(target)
        if (sources === undefined) {
          inboundSources.set(target, [source])
        } else {
          sources.push(source)
        }
      }
    }

    const queue: N[] = []
    for (const nodeKey of this.nodeKeyCache) {
      const node = nodeKey as N
      if (!outputs.has(node) && !this.connectionMap.has(node)) {
        if ((inboundCount.get(node) ?? 0) > 0) {
          queue.push(node)
        }
      }
    }

    let head = 0
    while (head < queue.length) {
      const node = queue[head] as N
      head++

      if (!this.nodeKeyCache.has(node)) continue
      if (outputs.has(node)) continue
      if (this.connectionMap.has(node)) continue
      if ((inboundCount.get(node) ?? 0) <= 0) continue

      if (collect) {
        pruned.add(node)
      }
      this.nodeKeyCache.delete(node)

      const sources = inboundSources.get(node)
      if (sources === undefined) continue

      for (let i = 0; i < sources.length; i++) {
        const source = sources[i] as N
        const info = this.connectionMap.get(source)
        if (info === undefined) continue

        const targets = info.targets
        for (let j = targets.length - 1; j >= 0; j--) {
          const target = targets[j]
          if (target !== undefined && target.node === node) {
            targets.splice(j, 1)
            this.linkKeyCache.delete(toLinkKey(source, node))
          }
        }

        if (targets.length === 0) {
          this.connectionMap.delete(source)
          if (!outputs.has(source) && (inboundCount.get(source) ?? 0) > 0) {
            queue.push(source)
          }
        }
      }

      inboundSources.delete(node)
      inboundCount.set(node, 0)
    }

    if (rebuildCache) {
      this.rebuildNodeKeyCache()
      this.rebuildLinkKeyCache()
    }
    return pruned
  }
}
