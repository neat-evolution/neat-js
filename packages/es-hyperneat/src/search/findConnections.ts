import type { Target } from '@neat-evolution/core'
import type { SyncExecutor } from '@neat-evolution/executor'
import { toPointKey, type PointKey } from '@neat-evolution/hyperneat'

import type { ESHyperNEATGenomeOptions } from '../ESHyperNEATGenomeOptions.js'

import { QuadPoint } from './QuadPoint.js'

export type WeightFn = (x: number, y: number) => number

/// Single iteration search for new nodes and connections from a given point.
export function findConnections(
  x: number,
  y: number,
  cppn: SyncExecutor,
  reverse: boolean,
  options: ESHyperNEATGenomeOptions
): Array<Target<PointKey, number>> {
  const f: WeightFn = (x2: number, y2: number): number => {
    const input = reverse ? [x2, y2, x, y] : [x, y, x2, y2]
    return cppn.execute(input)[0] as number
  }

  const connections: Array<Target<PointKey, number>> = []
  const root = new QuadPoint(0.0, 0.0, 1.0, 1, f, options)
  let minWeight = root.weight
  let maxWeight = root.weight

  let leaves: QuadPoint[] = [root]
  while (leaves.length > 0) {
    let newLeaves: QuadPoint[] = []
    for (const leaf of leaves) {
      const [mi, ma] = leaf.createChildren(f)
      minWeight = Math.min(minWeight, mi)
      maxWeight = Math.max(maxWeight, ma)
    }
    for (const leaf of leaves) {
      for (const child of leaf.expand(maxWeight - minWeight)) {
        newLeaves.push(child)
      }
    }
    leaves = newLeaves
  }
  // If all weight values are the same, no nodes will be collected.
  if (minWeight === maxWeight) {
    return connections
  }

  leaves = [root]
  while (
    leaves.length > 0 &&
    (options.maxDiscoveries === 0 ||
      connections.length < options.maxDiscoveries)
  ) {
    let newLeaves: QuadPoint[] = []
    for (const leaf of leaves) {
      for (const child of leaf.extract(f, connections, maxWeight - minWeight)) {
        newLeaves.push(child)
      }
    }
    leaves = newLeaves
  }

  // If the collection was limited by maxDiscoveries, nodes at the current depth in the tree
  // are included, since either they or their children would be if the search continues.
  for (const leaf of leaves) {
    connections.push({ node: toPointKey([leaf.x, leaf.y]), edge: leaf.weight })
  }

  // Only return the weights with the highest absolute value.
  if (options.maxOutgoing > 0 && connections.length > options.maxOutgoing) {
    connections.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))
    connections.length = options.maxOutgoing
  }
  return connections
}
