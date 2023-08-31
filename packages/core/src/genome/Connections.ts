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

  add(from: N, to: N, edge: E): void {
    if (this.createsCycle(from, to)) {
      throw new Error('cannot add link that creates cycle')
    }
    if (this.contains(from, to)) {
      throw new Error('cannot add existing connection')
    }
    const data = this.connections.get(nodeRefToKey(from))
    const target = { node: to, edge }
    if (data !== undefined) {
      data.targets.push(target)
    } else {
      this.connections.set(nodeRefToKey(from), {
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

  getAllConnections(): Array<Connection<N, E>> {
    const connections: Array<Connection<N, E>> = []
    for (const data of this.connections.values()) {
      for (const { node, edge } of data.targets) {
        connections.push({ from: data.node, to: node, edge })
      }
    }
    return connections
  }

  getAllNodes(): N[] {
    const nodes = new Set<N>()
    for (const connection of this.getAllConnections()) {
      nodes.add(connection.from)
      nodes.add(connection.to)
    }
    return Array.from(nodes)
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

  getTargets(from: N): N[] {
    return this.getEdges(from).map((t) => t.node)
  }

  getSources(): N[] {
    return Array.from(this.connections.values()).map((d) => d.node)
  }

  contains(from: N, to: N): boolean {
    return this.getEdges(from).some((t) => t.node === to)
  }

  containsNode(node: N): boolean {
    return this.getAllNodes().includes(node)
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
    const removedConnections =
      tmpTargets !== undefined
        ? tmpTargets.map((target) => ({
            from: node,
            to: target.node,
            edge: target.edge,
          }))
        : []

    // Remove inbound
    const deleteKeys: string[] = []
    for (const [key, data] of this.connections) {
      const index = data.targets.findIndex((t) => t.node === node)
      const target = data.targets[index]
      if (index !== -1 && target !== undefined) {
        removedConnections.push({
          from: data.node,
          to: node,
          edge: target.edge,
        })
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

  /// DFS search to check for cycles.
  ///
  /// If 'from' is reachable from 'to', then addition will cause cycle
  createsCycle(from: N, to: N): boolean {
    const visited = new Set<N>([to])
    const stack: N[] = [to]

    while (stack.length > 0) {
      const node = stack.pop()
      if (node === undefined) continue

      if (node === from) {
        return true // Started at to and reached from, addition will cause cycle
      }

      // Add all connecting nodes to both stack and visited
      // Avoid extra storage and double filtering by adding to stack and copying from stack into visited
      const targets = this.getTargets(node).filter((n) => !visited.has(n))
      stack.push(...targets)
      targets.forEach((n) => visited.add(n))
    }

    return false // Enable to reach from when starting at to, addition will not cause cycle
  }

  /// Determine order of nodes and links to activate in forward pass
  sortTopologically(): Array<OrderedAction<N, E>> {
    // Store number of incoming connections for all nodes
    const backwardCount = new Map<string, number>()

    for (const data of this.connections.values()) {
      for (const target of data.targets) {
        const key = nodeRefToKey(target.node)
        backwardCount.set(key, (backwardCount.get(key) ?? 0) + 1)
      }
    }

    // Start search from all nodes without incoming connections
    const stack: N[] = Array.from(this.connections.values())
      .map((d) => d.node)
      .filter((node) => (backwardCount.get(nodeRefToKey(node)) ?? 0) === 0)

    const actions: Array<OrderedAction<N, E>> = []

    // Create topological order
    let node = stack.pop()
    while (node !== undefined) {
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
      node = stack.pop()
    }
    return actions
  }

  prune(inputs: N[], outputs: N[], collect: boolean): N[] {
    const pruned = this.pruneDanglingInputs(inputs, collect)
    pruned.push(...this.pruneDanglingOutputs(outputs, collect))
    return pruned
  }

  pruneDanglingInputs(inputs: N[], collect: boolean): N[] {
    const backwardCount = new Map<string, number>()
    for (const data of this.connections.values()) {
      for (const target of data.targets) {
        backwardCount.set(
          nodeRefToKey(target.node),
          (backwardCount.get(nodeRefToKey(target.node)) ?? 0) + 1
        )
      }
    }

    const pruned: N[] = []

    let done = false
    while (!done) {
      const danglingInputs = Array.from(this.connections.values())
        .map((d) => d.node)
        .filter(
          (n) =>
            !inputs.includes(n) &&
            (backwardCount.get(nodeRefToKey(n)) ?? 0) === 0
        )
      if (danglingInputs.length === 0) {
        done = true
      }
      for (const node of danglingInputs) {
        const targets = this.connections.get(nodeRefToKey(node))?.targets
        backwardCount.delete(nodeRefToKey(node))
        this.connections.delete(nodeRefToKey(node))
        if (targets === undefined) {
          continue
        }
        for (const target of targets) {
          backwardCount.set(
            nodeRefToKey(target.node),
            (backwardCount.get(nodeRefToKey(target.node)) ?? 0) - 1
          )
        }
      }
      if (collect) {
        pruned.push(...danglingInputs)
      }
    }

    return pruned
  }

  pruneDanglingOutputs(outputs: N[], collect: boolean): N[] {
    const pruned = new Set<N>()

    let done = false
    while (!done) {
      let deletedNode = false

      for (const source of this.getSources()) {
        const targets =
          this.connections.get(nodeRefToKey(source))?.targets ?? []
        const deleteIndexes = Array.from(
          { length: (targets.length - 1 - 0) / 1 + 1 },
          (_, index) => 0 + index * 1
        ).filter(
          (i) =>
            // @ts-expect-error targets[i] is possibly undefined
            !outputs.includes(targets[i].node) &&
            // @ts-expect-error targets[i] is possibly undefined
            !this.connections.has(targets[i].node)
        )
        if (deleteIndexes.length > 0) {
          deletedNode = true
          if (deleteIndexes.length === targets.length) {
            if (collect) {
              targets.map((t) => t.node).forEach(pruned.add, pruned)
            }
            this.connections.delete(nodeRefToKey(source))
          } else {
            for (const deleteIndex of deleteIndexes) {
              if (collect && targets[deleteIndex] !== undefined) {
                // @ts-expect-error Object is possibly 'undefined'. ts(2532)
                pruned.add(targets[deleteIndex].node)
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
    return Array.from(pruned)
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
