import type {
  PooledFloat64Array,
  StaticExecutor,
} from '@neat-evolution/executor'
import type { Point } from '@neat-evolution/hyperneat'

import type { ESHyperNEATGenomeOptions } from '../ESHyperNEATGenomeOptions.js'

import { QuadPoint } from './QuadPoint.js'

export type WeightFn = (x: number, y: number) => number
type PointTarget = { node: Point; edge: number }

// Cache stats tracking
let _diagTotalQueries = 0
let _diagCacheHits = 0
let _diagCalls = 0

export function reportCacheStats(): {
  calls: number
  totalQueries: number
  cacheHits: number
  hitRate: number
  savedForwardCalls: number
} {
  const stats = {
    calls: _diagCalls,
    totalQueries: _diagTotalQueries,
    cacheHits: _diagCacheHits,
    hitRate: _diagTotalQueries > 0 ? _diagCacheHits / _diagTotalQueries : 0,
    savedForwardCalls: _diagCacheHits,
  }
  _diagTotalQueries = 0
  _diagCacheHits = 0
  _diagCalls = 0
  return stats
}

/**
 * Pack two quadtree coordinates into a single numeric Map key.
 * Coordinates are deterministic fractions (multiples of 1/2^depth),
 * so scaling by 2^20 produces exact integers. Each component fits
 * in 21 bits; the packed key fits in 42 bits — well within JS's
 * 53-bit integer precision.
 */
const COORD_SCALE = 1048576 // 2^20
const COORD_RANGE = 2097153 // 2 * COORD_SCALE + 1

function coordToKey(x: number, y: number): number {
  return (
    (Math.round(x * COORD_SCALE) + COORD_SCALE) * COORD_RANGE +
    (Math.round(y * COORD_SCALE) + COORD_SCALE)
  )
}

/// Single iteration search for new nodes and connections from a given point.
export function findConnectionsPoints(
  x: number,
  y: number,
  cppn: StaticExecutor,
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

  // Cache CPPN results within this findConnectionsPoints call.
  // Phase 2 band pruning queries neighbor coordinates that overlap with
  // phase 1 quadtree nodes — ~35% hit rate measured empirically.
  const queryCache = new Map<number, number>()
  let totalQueries = 0
  let cacheHits = 0

  const f: WeightFn = (x2: number, y2: number): number => {
    totalQueries++
    const key = coordToKey(x2, y2)
    const cached = queryCache.get(key)
    if (cached !== undefined) {
      cacheHits++
      return cached
    }

    if (reverse) {
      cppnInput[0] = x2
      cppnInput[1] = y2
    } else {
      cppnInput[2] = x2
      cppnInput[3] = y2
    }
    const result = cppn.forward(cppnInput)
    const weight = result[0] ?? 0
    // Release pooled output back immediately — we only need result[0]
    ;(result as PooledFloat64Array).release?.()
    queryCache.set(key, weight)
    return weight
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

  // Clear cached variance from Phase 1 so Phase 2 computes fresh values
  // for the fully-built tree. Phase 2 values can then be cached safely
  // since the tree structure is frozen.
  root.resetVarianceTree()

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

  // Diagnostic: accumulate cache stats
  _diagTotalQueries += totalQueries
  _diagCacheHits += cacheHits
  _diagCalls++

  // Only return the weights with the highest absolute value.
  if (options.maxOutgoing > 0 && connections.length > options.maxOutgoing) {
    connections.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))
    connections.length = options.maxOutgoing
  }
  return connections
}
