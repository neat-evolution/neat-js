import type { SyncExecutor } from '@neat-evolution/executor'
import type { Point } from '@neat-evolution/hyperneat'

import type { ESHyperNEATGenomeOptions } from '../ESHyperNEATGenomeOptions.js'

import { QuadPoint } from './QuadPoint.js'

export type WeightFn = (x: number, y: number) => number
type PointTarget = { node: Point; edge: number }

/// Single iteration search for new nodes and connections from a given point.
export function findConnectionsPoints(
  x: number,
  y: number,
  cppn: SyncExecutor,
  reverse: boolean,
  options: ESHyperNEATGenomeOptions
): PointTarget[] {
  // Pre-allocate input array to avoid repeated allocations
  const cppnInput = new Float64Array(4)
  if (reverse) {
    cppnInput[2] = x
    cppnInput[3] = y
  } else {
    cppnInput[0] = x
    cppnInput[1] = y
  }

  const f: WeightFn = (x2: number, y2: number): number => {
    if (reverse) {
      cppnInput[0] = x2
      cppnInput[1] = y2
    } else {
      cppnInput[2] = x2
      cppnInput[3] = y2
    }
    // execute now returns Float64Array, and the first element is the weight
    const result = cppn.execute(cppnInput)
    return result[0] ?? 0
  }

  const connections: PointTarget[] = []
  const root = QuadPoint.acquire(0.0, 0.0, 1.0, 1, f, options)
  let minWeight = root.weight
  let maxWeight = root.weight

  let leaves: QuadPoint[] = [root]
  while (leaves.length > 0) {
    const newLeaves: QuadPoint[] = []
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i]
      if (leaf === undefined) continue
      const [mi, ma] = leaf.createChildren(f)
      if (mi < minWeight) minWeight = mi
      if (ma > maxWeight) maxWeight = ma
    }
    const deltaWeight = maxWeight - minWeight
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i]
      if (leaf === undefined) continue
      const children = leaf.expand(deltaWeight)
      if (children !== null) {
        for (let j = 0; j < 4; j++) {
          const child = children[j]
          if (child !== undefined) {
            newLeaves.push(child)
          }
        }
      }
    }
    leaves = newLeaves
  }
  // If all weight values are the same, no nodes will be collected.
  if (minWeight === maxWeight) {
    QuadPoint.release(root)
    return connections
  }

  leaves = [root]
  while (
    leaves.length > 0 &&
    (options.maxDiscoveries === 0 ||
      connections.length < options.maxDiscoveries)
  ) {
    const newLeaves: QuadPoint[] = []
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i]
      if (leaf === undefined) continue
      leaf.extractPointsInto(f, connections, maxWeight - minWeight, newLeaves)
    }
    leaves = newLeaves
  }

  // If the collection was limited by maxDiscoveries, nodes at the current depth in the tree
  // are included, since either they or their children would be if the search continues.
  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i]
    if (leaf !== undefined) {
      connections.push({
        node: [leaf.x, leaf.y],
        edge: leaf.weight,
      })
    }
  }

  // Release the entire tree back to the pool
  QuadPoint.release(root)

  // Only return the weights with the highest absolute value.
  if (options.maxOutgoing > 0 && connections.length > options.maxOutgoing) {
    connections.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))
    connections.length = options.maxOutgoing
  }
  return connections
}
