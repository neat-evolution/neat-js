import type { Connection } from '@neat-evolution/core'
import type { StaticExecutor } from '@neat-evolution/executor'
import type { Point } from '@neat-evolution/hyperneat'

import type { ESHyperNEATGenomeOptions } from '../ESHyperNEATGenomeOptions.js'

import { findConnectionsPoints } from './findConnections.js'

/// Iteratively explore substrate by calling find_connections on discovered nodes
export function exploreSubstrate<K extends number>(
  inputs: Point[],
  outputs: Point[],
  cppn: StaticExecutor,
  depth: number,
  reverse: boolean,
  allowConnectionsToInput: boolean,
  options: ESHyperNEATGenomeOptions,
  keyOf: (point: Point) => K
): [Point[][], Array<Connection<K, number>>] {
  const outputSet = new Set<K>()
  for (const output of outputs) {
    outputSet.add(keyOf(output))
  }
  const visited = new Set<K>()
  if (!allowConnectionsToInput) {
    for (const input of inputs) {
      visited.add(keyOf(input))
    }
  }
  const nodes: Point[][] = [inputs]
  const connections: Array<Connection<K, number>> = []
  const resolutionReciprocal = 1 / options.resolution

  for (let d = 0; d < depth; d++) {
    const discoveries: Array<Connection<K, number>> = []
    const discoveredPointsByKey = new Map<K, Point>()
    const layer = nodes[d] as Point[]

    // Search from all nodes within previous layer of discoveries
    for (const node of layer) {
      const [x, y] = node
      const targets = findConnectionsPoints(
        x * resolutionReciprocal,
        y * resolutionReciprocal,
        cppn,
        reverse,
        options
      )
      const nodeKey = keyOf(node)
      for (const target of targets) {
        const targetPoint = target.node
        // Use Math.trunc to match Rust's `as i64` truncation toward zero
        const targetNode: Point = [
          Math.trunc(targetPoint[0] * options.resolution),
          Math.trunc(targetPoint[1] * options.resolution),
        ]
        const targetKey = keyOf(targetNode)
        if (!visited.has(targetKey)) {
          discoveries.push([nodeKey, targetKey, target.edge])
          discoveredPointsByKey.set(targetKey, targetNode)
        }
      }
    }

    // Store all new connections in correct direction
    for (const connection of discoveries) {
      connections.push(
        reverse ? [connection[1], connection[0], connection[2]] : connection
      )
    }

    // Collect all unique target nodes
    // Avoid further exploration from output nodes
    const nextNodes = new Set<K>()
    const nextLayer: Point[] = []
    for (const connection of discoveries) {
      const toKey = connection[1]
      if (!outputSet.has(toKey) && !nextNodes.has(toKey)) {
        nextNodes.add(toKey)
        visited.add(toKey)
        const targetNode = discoveredPointsByKey.get(toKey)
        if (targetNode !== undefined) {
          nextLayer.push(targetNode)
        }
      }
    }

    // Stop search if there are no more nodes to search
    if (nextNodes.size === 0) {
      break
    }

    nodes.push(nextLayer)
  }

  return [nodes, connections]
}
