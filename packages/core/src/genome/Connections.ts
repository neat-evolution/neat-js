import { nodeRefToKey, type NodeRef } from '../node/Node.js'

type Edge = number

export interface Target<N extends NodeRef, E extends Edge> {
  node: N
  edge: E
}

export type Connection<N extends NodeRef, E extends Edge> = [
  from: N,
  to: N,
  edge: E
]

export type OrderedActionEdge<N extends NodeRef, E extends Edge> = Connection<
  N,
  E
>

export type OrderedActionNode<N extends NodeRef> = [nodeRef: N]

export type OrderedAction<N extends NodeRef, E extends Edge> =
  | OrderedActionEdge<N, E>
  | OrderedActionNode<N>

export const isOrderedActionEdge = <N extends NodeRef, E extends Edge>(
  orderedAction: OrderedAction<N, E>
): orderedAction is OrderedActionEdge<N, E> => {
  return (orderedAction as OrderedActionEdge<N, E>).length === 3
}

export const isOrderedActionNode = <N extends NodeRef, E extends Edge>(
  orderedAction: OrderedAction<N, E>
): orderedAction is OrderedActionNode<N> => {
  return (orderedAction as OrderedActionNode<N>).length === 1
}

export interface ConnectionData<N extends NodeRef, E extends Edge> {
  node: N
  targets: Array<Target<N, E>>
}

export class Connections<N extends NodeRef = NodeRef, E extends Edge = Edge> {
  private readonly connections: Map<string, ConnectionData<N, E>>

  constructor() {
    this.connections = new Map<string, ConnectionData<N, E>>()
  }

  add(from: N, to: N, edge: E, isSafe?: boolean): void {
    // Sometimes we already know that the connection is safe
    if (isSafe == null || (isSafe != null && !isSafe)) {
      if (this.createsCycle(from, to)) {
        throw new Error('cannot add link that creates cycle')
      }
    }
    if (this.contains(from, to)) {
      throw new Error('cannot add existing connection')
    }
    const key = nodeRefToKey(from)
    const data = this.connections.get(key)

    const target = { node: to, edge }
    if (data !== undefined) {
      data.targets.push(target)
    } else {
      this.connections.set(key, {
        node: from,
        targets: [target],
      })
    }
  }

  extend(other: Connections<N, E>) {
    for (const source of other.getSources()) {
      for (const { node, edge } of other.getEdges(source)) {
        this.add(source, node, edge)
      }
    }
  }

  setEdge(from: N, to: N, edge: E) {
    const data = this.connections.get(nodeRefToKey(from))
    if (data === undefined) {
      throw new Error('cannot set non-existent edge')
    }
    const target = data.targets.find((t) => t.node === to)
    if (target === undefined) {
      throw new Error('cannot set non-existent edge')
    }
    target.edge = edge
  }

  getEdge(from: N, to: N): E {
    const data = this.connections.get(nodeRefToKey(from))
    if (data === undefined) {
      throw new Error('cannot get non-existent edge')
    }
    const target = data.targets.find((t) => t.node === to)
    if (target === undefined) {
      throw new Error('cannot get non-existent edge')
    }
    return target.edge
  }

  *getAllConnections(): Generator<Connection<N, E>, void, undefined> {
    for (const data of this.connections.values()) {
      for (const { node, edge } of data.targets) {
        yield [data.node, node, edge]
      }
    }
  }

  *getAllNodes(): Generator<N, void, undefined> {
    for (const connection of this.getAllConnections()) {
      yield connection[0]
      yield connection[1]
    }
  }

  getEdges(from: N): Array<Target<N, E>> {
    const targets = this.connections.get(nodeRefToKey(from))?.targets
    return targets ?? []
  }

  edgeCount(from: N): number {
    const targets = this.connections.get(nodeRefToKey(from))?.targets
    if (targets !== undefined) {
      return targets.length
    } else {
      return 0
    }
  }

  *getTargets(from: N): Generator<N, void, undefined> {
    const targets = this.getEdges(from)
    for (const target of targets) {
      yield target.node
    }
  }

  *getSources(): Generator<N, void, undefined> {
    for (const data of this.connections.values()) {
      yield data.node
    }
  }

  contains(from: N, to: N): boolean {
    for (const { node } of this.getEdges(from)) {
      if (node === to) {
        return true
      }
    }
    return false
  }

  containsNode(node: N): boolean {
    for (const knownNode of this.getAllNodes()) {
      if (knownNode === node) {
        return true
      }
    }
    return false
  }

  remove(from: N, to: N): E {
    const targets = this.connections.get(nodeRefToKey(from))?.targets
    if (targets === undefined) {
      throw new Error('cannot remove non-existent connection')
    }
    if (targets.length === 1 && targets[0] !== undefined) {
      const { edge } = targets[0]
      this.connections.delete(nodeRefToKey(from))
      return edge
    } else {
      const index = targets.findIndex((t) => t.node === to)
      if (index === -1) {
        throw new Error('cannot remove non-existent connection')
      }
      const edges = targets.splice(index, 1)
      const edge = edges[0]?.edge
      if (edge === undefined) {
        throw new Error('cannot remove non-existent connection')
      }
      return edge
    }
  }

  removeNode(node: N): Array<Connection<N, E>> {
    // Remove outgoing
    const tmpTargets = this.connections.get(nodeRefToKey(node))?.targets
    this.connections.delete(nodeRefToKey(node))
    const removedConnections: Array<Connection<N, E>> = []

    if (tmpTargets !== undefined) {
      for (const target of tmpTargets) {
        removedConnections.push([node, target.node, target.edge])
      }
    }

    // Remove inbound
    const deleteKeys: string[] = []
    for (const [key, data] of this.connections) {
      const index = data.targets.findIndex((t) => t.node === node)
      const target = data.targets[index]
      if (index !== -1 && target !== undefined) {
        removedConnections.push([data.node, node, target.edge])
        data.targets.splice(index, 1)
        if (data.targets.length === 0) {
          deleteKeys.push(key)
        }
      }
    }
    for (const key of deleteKeys) {
      this.connections.delete(key)
    }

    return removedConnections
  }

  /// BFS search to check for cycles.
  ///
  /// If 'from' is reachable from 'to', then addition will cause cycle
  createsCycle(from: N, to: N): boolean {
    const visited = new Set<N>([to])
    const queue: N[] = [to] // Using queue for BFS

    let front = 0 // For an optimized queue

    while (front < queue.length) {
      const node = queue[front] // Queue "dequeue"
      front++ // Move the front pointer forward instead of shifting the array

      if (node === from) {
        return true
      }

      const targets = this.getTargets(node as N)
      for (const target of targets) {
        if (!visited.has(target)) {
          visited.add(target)
          queue.push(target) // Queue "enqueue"
        }
      }
    }

    return false
  }

  /// Determine order of nodes and links to activate in forward pass
  sortTopologically(): Array<OrderedAction<N, E>> {
    // Store number of incoming connections for all nodes
    const backwardCount = new Map<string, number>()

    for (const { targets } of this.connections.values()) {
      for (const target of targets) {
        const key = nodeRefToKey(target.node)
        const count = backwardCount.get(key) ?? 0
        backwardCount.set(key, count + 1)
      }
    }

    // Start search from all nodes without incoming connections
    const stack: N[] = []
    for (const { node } of this.connections.values()) {
      const key = nodeRefToKey(node)
      const count = backwardCount.get(key) ?? 0
      if (count === 0) {
        stack.push(node)
      }
    }
    const actions: Array<OrderedAction<N, E>> = []

    // Create topological order
    let node
    while (stack.length > 0) {
      node = stack.pop() as N

      actions.push([node])

      // Process all outgoing connections from the current node
      for (const target of this.getEdges(node)) {
        actions.push([node, target.node, target.edge])

        // Reduce backward count by 1
        backwardCount.set(
          nodeRefToKey(target.node),
          (backwardCount.get(nodeRefToKey(target.node)) ?? 0) - 1
        )

        // Add nodes with no incoming connections to the stack
        if (backwardCount.get(nodeRefToKey(target.node)) === 0) {
          stack.push(target.node)
        }
      }
    }
    return actions
  }

  prune(inputs: Set<N>, outputs: Set<N>, collect: boolean): Set<N> {
    const pruned = new Set<N>()
    this.pruneDanglingInputs(inputs, collect, pruned)
    this.pruneDanglingOutputs(outputs, collect, pruned)
    return pruned
  }

  pruneDanglingInputs(
    inputs: Set<N>,
    collect: boolean,
    prunedRef?: Set<N>
  ): Set<N> {
    const backwardCount = new Map<string, number>()
    for (const data of this.connections.values()) {
      for (const target of data.targets) {
        backwardCount.set(
          nodeRefToKey(target.node),
          (backwardCount.get(nodeRefToKey(target.node)) ?? 0) + 1
        )
      }
    }

    const pruned: Set<N> = prunedRef ?? new Set<N>()

    let done = false
    while (!done) {
      const danglingInputs = new Set<N>()

      for (const { node } of this.connections.values()) {
        const count = backwardCount.get(nodeRefToKey(node)) ?? 0
        if (!inputs.has(node) && count === 0) {
          danglingInputs.add(node)
        }
      }
      if (danglingInputs.size === 0) {
        done = true
      }
      for (const node of danglingInputs) {
        const key = nodeRefToKey(node)
        const targets = this.connections.get(key)?.targets

        backwardCount.delete(key)
        this.connections.delete(key)

        if (targets === undefined) {
          continue
        }

        for (const { node } of targets) {
          const key = nodeRefToKey(node)
          const count = backwardCount.get(key) ?? 0
          backwardCount.set(key, count - 1)
        }
      }
      if (collect) {
        for (const node of danglingInputs) {
          pruned.add(node)
        }
      }
    }

    return pruned
  }

  pruneDanglingOutputs(
    outputs: Set<N>,
    collect: boolean,
    prunedRef?: Set<N>
  ): Set<N> {
    const pruned = prunedRef ?? new Set<N>()

    let done = false
    while (!done) {
      let deletedNode = false

      for (const source of this.getSources()) {
        const targets =
          this.connections.get(nodeRefToKey(source))?.targets ?? []
        const deleteIndexes: number[] = []

        for (const [i, { node }] of targets.entries()) {
          const targetNode = node

          if (
            !outputs.has(targetNode) &&
            !this.connections.has(nodeRefToKey(targetNode))
          ) {
            deleteIndexes.push(i)
          }
        }

        if (deleteIndexes.length > 0) {
          deletedNode = true
          if (deleteIndexes.length === targets.length) {
            if (collect) {
              for (const { node } of targets) {
                pruned.add(node)
              }
            }
            this.connections.delete(nodeRefToKey(source))
          } else {
            for (const deleteIndex of deleteIndexes) {
              if (collect && targets[deleteIndex] !== undefined) {
                const node = (targets[deleteIndex] as Target<N, E>).node
                pruned.add(node)
              }
              targets.splice(deleteIndex, 1)
            }
          }
        }
      }
      if (!deletedNode) {
        done = true
      }
    }
    return pruned
  }

  // static from<N extends NodeRef, E extends Edge>(
  //   list: Array<Connection<N, E>>
  // ) {
  //   const connections = new Connections<N, E>()
  //   for (const { from, to, edge } of list) {
  //     connections.add(from, to, edge)
  //   }
  //   return connections
  // }
}
