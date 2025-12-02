import { type Connection } from '@neat-evolution/core'
import { type SyncExecutor } from '@neat-evolution/executor'
import {
  type Point,
  type PointKey,
  toPointKey,
  fromPointKey,
} from '@neat-evolution/hyperneat'

import type { ESHyperNEATGenomeOptions } from '../ESHyperNEATGenomeOptions.js'

import { findConnections } from './findConnections.js'

/// Iteratively explore substrate by calling find_connections on discovered nodes
export function exploreSubstrate(
  inputs: Point[],
  outputs: Point[],
  cppn: SyncExecutor,
  depth: number,
  reverse: boolean,
  allowConnectionsToInput: boolean,
  options: ESHyperNEATGenomeOptions
): [Point[][], Array<Connection<PointKey, number>>] {
  const outputSet = new Set<PointKey>()
  for (const output of outputs) {
    outputSet.add(toPointKey(output))
  }
  const visited = new Set<PointKey>()
  if (!allowConnectionsToInput) {
    for (const input of inputs) {
      visited.add(toPointKey(input))
    }
  }
  const nodes: Point[][] = [inputs]
  const connections: Array<Connection<PointKey, number>> = []
  const resolutionReciprocal = 1 / options.resolution

  for (let d = 0; d < depth; d++) {
    const discoveries: Array<Connection<PointKey, number>> = []
    const layer = nodes[d] as Point[]
    // Search from all nodes within previous layer of discoveries
    for (const node of layer) {
      const [x, y] = node
      const targets = findConnections(
        x * resolutionReciprocal,
        y * resolutionReciprocal,
        cppn,
        reverse,
        options
      )
      const nodeKey = toPointKey(node)
      for (const target of targets) {
        const targetPoint = fromPointKey(target.node)
        // Use Math.trunc to match Rust's `as i64` truncation toward zero
        const targetNode: Point = [
          Math.trunc(targetPoint[0] * options.resolution),
          Math.trunc(targetPoint[1] * options.resolution),
        ]
        const targetKey = toPointKey(targetNode)
        if (!visited.has(targetKey)) {
          discoveries.push([nodeKey, targetKey, target.edge])
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
    const nextNodes = new Set<PointKey>()
    const nextLayer: Point[] = []
    for (const connection of discoveries) {
      const toKey = connection[1]
      if (!outputSet.has(toKey) && !nextNodes.has(toKey)) {
        nextNodes.add(toKey)
        visited.add(toKey)
        nextLayer.push(fromPointKey(toKey))
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
