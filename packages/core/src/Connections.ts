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
  /** Parallel arrays — targetNodes[i] connects to targetEdges[i].
   *  Eliminates per-target object allocation. */
  targetNodes: N[]
  targetEdges: E[]
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
    const knownNotToCreateCycle = isSafe ?? !this.createsCycle(from, to)
    if (!knownNotToCreateCycle) {
      throw new Error('cannot add link that creates cycle')
    }

    if (this.linkKeyCache.has(linkKey)) {
      throw new Error('cannot add existing connection')
    }
    const info = this.connectionMap.get(from)

    if (info !== undefined) {
      info.targetNodes.push(to)
      info.targetEdges.push(edge)
    } else {
      this.connectionMap.set(from, {
        node: from,
        targetNodes: [to],
        targetEdges: [edge],
      })
    }
    this.nodeKeyCache.add(from)
    this.nodeKeyCache.add(to)
    this.linkKeyCache.add(linkKey)
  }

  /**
   * Bulk-add links, skipping cycle checks and duplicate validation.
   * Only safe when loading from known-good data (factoryOptions).
   */
  bulkAdd(links: ReadonlyArray<Connection<N, E>>): void {
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      if (link === undefined) continue
      const [from, to, edge] = link
      const info = this.connectionMap.get(from)
      if (info !== undefined) {
        info.targetNodes.push(to)
        info.targetEdges.push(edge)
      } else {
        this.connectionMap.set(from, {
          node: from,
          targetNodes: [to],
          targetEdges: [edge],
        })
      }
      this.nodeKeyCache.add(from)
      this.nodeKeyCache.add(to)
      this.linkKeyCache.add(toLinkKey(from, to))
    }
  }

  extend(other: Connections<N, E>) {
    for (const info of other.connectionMap.values()) {
      for (let i = 0; i < info.targetNodes.length; i++) {
        this.add(info.node, info.targetNodes[i] as N, info.targetEdges[i] as E)
      }
    }
  }

  setEdge(from: N, to: N, edge: E) {
    const data = this.connectionMap.get(from)
    if (data === undefined) {
      throw new Error('cannot set non-existent edge')
    }
    const idx = data.targetNodes.indexOf(to)
    if (idx === -1) {
      throw new Error('cannot set non-existent edge')
    }
    data.targetEdges[idx] = edge
  }

  getEdge(from: N, to: N): E {
    const data = this.connectionMap.get(from)
    if (data === undefined) {
      throw new Error('cannot get non-existent edge')
    }
    const idx = data.targetNodes.indexOf(to)
    if (idx === -1) {
      throw new Error('cannot get non-existent edge')
    }
    return data.targetEdges[idx] as E
  }

  /**
   * Get all connections (fast)
   * @yields {Connection<N, E>} connection
   */
  *connections(): Generator<Connection<N, E>, void, undefined> {
    for (const info of this.connectionMap.values()) {
      for (let i = 0; i < info.targetNodes.length; i++) {
        yield [info.node, info.targetNodes[i] as N, info.targetEdges[i] as E]
      }
    }
  }

  /**
   * Get all nodes
   * @yields {N} node
   */
  *nodes(): Generator<N, void, undefined> {
    const uniqueNodes = new Set<N>()
    for (const info of this.connectionMap.values()) {
      if (!uniqueNodes.has(info.node)) {
        yield info.node
        uniqueNodes.add(info.node)
      }
      for (let i = 0; i < info.targetNodes.length; i++) {
        const target = info.targetNodes[i] as N
        if (!uniqueNodes.has(target)) {
          yield target
          uniqueNodes.add(target)
        }
      }
    }
  }

  getTargetsLength(from: N): number {
    return this.connectionMap.get(from)?.targetNodes.length ?? 0
  }

  getTargets(from: N): Array<Target<N, E>> {
    const info = this.connectionMap.get(from)
    if (info === undefined) return []
    const result: Array<Target<N, E>> = []
    for (let i = 0; i < info.targetNodes.length; i++) {
      result.push({
        node: info.targetNodes[i] as N,
        edge: info.targetEdges[i] as E,
      })
    }
    return result
  }

  hasConnection(from: N, to: N): boolean {
    return this.linkKeyCache.has(toLinkKey(from, to))
  }

  hasNode(node: N): boolean {
    return this.nodeKeyCache.has(node)
  }

  hasInbound(node: N): boolean {
    for (const info of this.connectionMap.values()) {
      if (info.targetNodes.indexOf(node) !== -1) {
        return true
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

    const tNodes = info.targetNodes
    const tEdges = info.targetEdges

    if (tNodes.length === 0) {
      throw new Error('cannot remove non-existent connection')
    }

    let removedEdge: E
    if (tNodes.length === 1) {
      if (tNodes[0] !== to) {
        throw new Error('cannot remove non-existent connection')
      }
      removedEdge = tEdges[0] as E
      this.connectionMap.delete(from)
    } else {
      const index = tNodes.indexOf(to)
      if (index === -1) {
        throw new Error('cannot remove non-existent connection')
      }

      removedEdge = tEdges[index] as E
      // swap-remove on both parallel arrays
      const lastIdx = tNodes.length - 1
      tNodes[index] = tNodes[lastIdx] as N
      tEdges[index] = tEdges[lastIdx] as E
      tNodes.pop()
      tEdges.pop()
    }

    this.linkKeyCache.delete(linkKey)
    if (!this.connectionMap.has(from) && !this.hasInbound(from)) {
      this.nodeKeyCache.delete(from)
    }
    if (!this.connectionMap.has(to) && !this.hasInbound(to)) {
      this.nodeKeyCache.delete(to)
    }

    return removedEdge
  }

  deleteNode(node: N): Array<Connection<N, E>> {
    const removedConnections: Array<Connection<N, E>> = []
    const info = this.connectionMap.get(node)
    if (info !== undefined) {
      for (let i = 0; i < info.targetNodes.length; i++) {
        const targetNode = info.targetNodes[i] as N
        removedConnections.push([node, targetNode, info.targetEdges[i] as E])
        this.linkKeyCache.delete(toLinkKey(node, targetNode))
      }
      this.connectionMap.delete(node)
    }

    // Remove inbound
    const deleteKeys: N[] = []

    for (const [source, srcInfo] of this.connectionMap.entries()) {
      const idx = srcInfo.targetNodes.indexOf(node)
      if (idx !== -1) {
        removedConnections.push([source, node, srcInfo.targetEdges[idx] as E])
        this.linkKeyCache.delete(toLinkKey(source, node))
        // splice from both parallel arrays
        srcInfo.targetNodes.splice(idx, 1)
        srcInfo.targetEdges.splice(idx, 1)
        if (srcInfo.targetNodes.length === 0) {
          deleteKeys.push(source)
        }
      }
    }

    for (const sourceKey of deleteKeys) {
      this.connectionMap.delete(sourceKey)
    }

    this.nodeKeyCache.delete(node)
    this.rebuildNodeKeyCache()

    return removedConnections
  }

  /// BFS search to check for cycles.
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
        const tNodes = info.targetNodes
        for (let i = 0; i < tNodes.length; i++) {
          const target = tNodes[i]
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

    visited.clear()
    queue.length = 0

    return found
  }

  sortTopologically(): Array<Action<N, E>> {
    const backwardCount = new Map<N, number>()

    for (const info of this.connectionMap.values()) {
      for (let i = 0; i < info.targetNodes.length; i++) {
        const target = info.targetNodes[i] as N
        backwardCount.set(target, (backwardCount.get(target) ?? 0) + 1)
      }
    }

    const stack: N[] = []
    for (const nodeKey of this.nodeKeyCache) {
      if ((backwardCount.get(nodeKey) ?? 0) === 0) {
        stack.push(nodeKey as N)
      }
    }

    const result: Array<Action<N, E>> = []
    while (stack.length > 0) {
      const node = stack.pop() as N
      result.push([node])

      const info = this.connectionMap.get(node)
      if (info !== undefined) {
        for (let i = 0; i < info.targetNodes.length; i++) {
          const targetNode = info.targetNodes[i] as N
          const targetEdge = info.targetEdges[i] as E
          result.push([node, targetNode, targetEdge])

          const count = (backwardCount.get(targetNode) ?? 0) - 1
          backwardCount.set(targetNode, count)

          if (count === 0) {
            stack.push(targetNode)
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
    for (const info of this.connectionMap.values()) {
      for (let i = 0; i < info.targetNodes.length; i++) {
        const target = info.targetNodes[i] as N
        backwardCount.set(target, (backwardCount.get(target) ?? 0) + 1)
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
        const info = this.connectionMap.get(node)
        backwardCount.delete(node)
        this.connectionMap.delete(node)
        this.nodeKeyCache.delete(node)

        if (info !== undefined) {
          for (let i = 0; i < info.targetNodes.length; i++) {
            const target = info.targetNodes[i] as N
            const count = backwardCount.get(target)
            if (count !== undefined) {
              backwardCount.set(target, count - 1)
              this.linkKeyCache.delete(toLinkKey(node, target))
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
      for (let i = 0; i < info.targetNodes.length; i++) {
        const target = info.targetNodes[i] as N
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

        // Remove target from parallel arrays (reverse scan for splice)
        for (let j = info.targetNodes.length - 1; j >= 0; j--) {
          if (info.targetNodes[j] === node) {
            info.targetNodes.splice(j, 1)
            info.targetEdges.splice(j, 1)
            this.linkKeyCache.delete(toLinkKey(source, node))
          }
        }

        if (info.targetNodes.length === 0) {
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
