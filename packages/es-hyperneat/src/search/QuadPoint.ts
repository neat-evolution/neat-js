import type { Point } from '@neat-evolution/hyperneat'

import type { ESHyperNEATGenomeOptions } from '../ESHyperNEATGenomeOptions.js'

import type { WeightFn } from './findConnections.js'
import { quickSelectMedian } from './quickSelectMedian.js'

type PointEdge = {
  node: Point
  edge: number
}

function isWeightNumber(value: WeightFn | number): value is number {
  return typeof value === 'number'
}

export class QuadPoint {
  private static pool: QuadPoint[] = []
  private static weightsPool: number[] = []
  private static traversalPool: QuadPoint[] = []

  public x: number
  public y: number
  public width: number
  public weight: number
  public depth: number
  public variance: number
  public children: null | QuadPoint[]
  public options: ESHyperNEATGenomeOptions

  constructor(
    x: number,
    y: number,
    width: number,
    depth: number,
    weightFn: WeightFn | number,
    options: ESHyperNEATGenomeOptions
  ) {
    this.x = x
    this.y = y
    this.width = width
    this.depth = depth
    this.options = options
    this.weight = isWeightNumber(weightFn) ? weightFn : weightFn(x, y)
    this.variance = 0.0
    this.children = null
  }

  public static acquire(
    x: number,
    y: number,
    width: number,
    depth: number,
    weightFn: WeightFn | number,
    options: ESHyperNEATGenomeOptions
  ): QuadPoint {
    const point = QuadPoint.pool.pop()
    if (point) {
      point.x = x
      point.y = y
      point.width = width
      point.depth = depth
      point.options = options
      point.weight = typeof weightFn === 'number' ? weightFn : weightFn(x, y)
      point.variance = 0.0

      point.children = null
      return point
    }
    return new QuadPoint(x, y, width, depth, weightFn, options)
  }

  public static release(point: QuadPoint): void {
    const children = point.children
    if (children) {
      const child0 = children[0]
      if (child0) QuadPoint.release(child0)
      const child1 = children[1]
      if (child1) QuadPoint.release(child1)
      const child2 = children[2]
      if (child2) QuadPoint.release(child2)
      const child3 = children[3]
      if (child3) QuadPoint.release(child3)
    }
    point.children = null
    QuadPoint.pool.push(point)
  }

  /// Collect weight of all nodes in tree. If root is true, collect the root's weight. If
  /// internal is true, collect all internal node weights. Always collect leaf node weights.
  private collectLeafWeightsLeafOnly(weights: number[]): void {
    const stack = QuadPoint.traversalPool
    let top = 0
    stack[top++] = this

    while (top > 0) {
      const node = stack[--top]
      if (node === undefined) continue
      const children = node.children
      if (children === null) {
        weights.push(node.weight)
        continue
      }

      // Push in reverse so LIFO traversal visits 0..3, matching the old recursive order.
      for (let i = 3; i >= 0; i--) {
        const child = children[i]
        if (child !== undefined) {
          stack[top++] = child
        }
      }
    }

    stack.length = 0
  }

  collectLeafWeights(
    weights: number[],
    root: boolean,
    internal: boolean
  ): void {
    if (this.options.onlyLeafVariance) {
      this.collectLeafWeightsLeafOnly(weights)
      return
    }

    if ((root && !this.options.onlyLeafVariance) || this.children === null) {
      weights.push(this.weight)
    }
    if (this.children !== null) {
      for (let i = 0; i < 4; i++) {
        const child = this.children[i]
        if (child !== undefined) {
          child.collectLeafWeights(weights, internal, internal)
        }
      }
    }
  }

  calcVariance(deltaWeight: number, root: boolean, branch: boolean): number {
    if (deltaWeight === 0.0) {
      return 0.0
    }

    if (this.options.onlyLeafVariance && !this.options.medianVariance) {
      const dw = this.options.relativeVariance ? deltaWeight : 1.0
      const stack = QuadPoint.traversalPool
      let top = 0
      stack[top++] = this

      let count = 0
      let sum = 0
      while (top > 0) {
        const node = stack[--top]
        if (node === undefined) continue
        const children = node.children
        if (children === null) {
          sum += node.weight
          count++
          continue
        }
        for (let i = 3; i >= 0; i--) {
          const child = children[i]
          if (child !== undefined) {
            stack[top++] = child
          }
        }
      }

      if (count === 0) {
        stack.length = 0
        return 0.0
      }

      const centroid = sum / count
      let sumSquares = 0
      let maxSquare = 0

      stack[top++] = this
      while (top > 0) {
        const node = stack[--top]
        if (node === undefined) continue
        const children = node.children
        if (children === null) {
          const normalized = (centroid - node.weight) / dw
          const square = normalized * normalized
          sumSquares += square
          if (square > maxSquare) {
            maxSquare = square
          }
          continue
        }
        for (let i = 3; i >= 0; i--) {
          const child = children[i]
          if (child !== undefined) {
            stack[top++] = child
          }
        }
      }

      stack.length = 0
      this.variance = this.options.maxVariance ? maxSquare : sumSquares / count

      return this.variance
    }

    const weights = QuadPoint.weightsPool
    weights.length = 0
    this.collectLeafWeights(weights, root, branch)

    const len = weights.length
    if (len === 0) {
      return 0.0
    }

    const dw = this.options.relativeVariance ? deltaWeight : 1.0
    let sumSquares = 0
    let maxSquare = 0

    let centroid: number
    if (this.options.medianVariance) {
      // Safe to select in place because order is not used after this point.
      centroid = quickSelectMedian(weights)
    } else {
      // mean weight
      let sum = 0
      for (let i = 0; i < len; i++) {
        const weight = weights[i]
        if (weight !== undefined) {
          sum += weight
        }
      }
      centroid = sum / len
    }

    for (let i = 0; i < len; i++) {
      const weight = weights[i]
      if (weight === undefined) {
        continue
      }
      const normalized = (centroid - weight) / dw
      const square = normalized * normalized
      sumSquares += square
      if (square > maxSquare) {
        maxSquare = square
      }
    }

    this.variance = this.options.maxVariance ? maxSquare : sumSquares / len
    // Clear pool for next use
    weights.length = 0

    return this.variance
  }

  /// Creates the four children of a node. Returns their min and max weight value.
  createChildren(f: WeightFn): [minWeight: number, maxWeight: number] {
    const width = this.width / 2.0
    const depth = this.depth + 1

    this.children = [
      QuadPoint.acquire(
        this.x - width,
        this.y - width,
        width,
        depth,
        f,
        this.options
      ),
      QuadPoint.acquire(
        this.x - width,
        this.y + width,
        width,
        depth,
        f,
        this.options
      ),
      QuadPoint.acquire(
        this.x + width,
        this.y + width,
        width,
        depth,
        f,
        this.options
      ),
      QuadPoint.acquire(
        this.x + width,
        this.y - width,
        width,
        depth,
        f,
        this.options
      ),
    ]

    const child0 = this.children[0]
    if (child0 == null) {
      throw new Error('QuadPoint children were not initialized')
    }
    let minWeight = child0.weight
    let maxWeight = child0.weight

    for (let i = 1; i < 4; i++) {
      const child = this.children[i]
      if (child !== undefined) {
        const w = child.weight
        if (w < minWeight) minWeight = w
        if (w > maxWeight) maxWeight = w
      }
    }

    return [minWeight, maxWeight]
  }

  /// Returns an iterable of children if this parent (self) should be expanded
  expand(deltaWeight: number): QuadPoint[] | null {
    const expand =
      this.depth + 1 < this.options.initialResolution ||
      (this.depth + 1 < this.options.maxResolution &&
        this.calcVariance(deltaWeight, true, true) >
          this.options.divisionThreshold)

    if (expand && this.children !== null) {
      return this.children
    }
    return null
  }

  /// Extracts children with high variance.
  private extractInternal<TNode>(
    f: WeightFn,
    connections: Array<{ node: TNode; edge: number }>,
    deltaWeight: number,
    toNode: (x: number, y: number) => TNode,
    childrenToExpand: QuadPoint[]
  ): void {
    if (this.children === null) {
      return
    }

    const varianceThreshold = this.options.varianceThreshold
    const bandThreshold = this.options.bandThreshold
    const width = this.width

    if (bandThreshold <= 0.0) {
      for (let i = 0; i < 4; i++) {
        const child = this.children[i]
        if (child === undefined) continue
        const variance = child.calcVariance(deltaWeight, false, true)
        if (variance <= varianceThreshold) {
          connections.push({
            node: toNode(child.x, child.y),
            edge: child.weight,
          })
        }
        if (variance > varianceThreshold) {
          childrenToExpand.push(child)
        }
      }
      return
    }

    for (let i = 0; i < 4; i++) {
      const child = this.children[i]
      if (child === undefined) continue
      const variance = child.calcVariance(deltaWeight, false, true)
      if (variance <= varianceThreshold) {
        const childX = child.x
        const childY = child.y
        const childWeight = child.weight
        let include = false

        const dUp = Math.abs(childWeight - f(childX, childY - width))
        if (dUp >= bandThreshold) {
          const dDown = Math.abs(childWeight - f(childX, childY + width))
          if (dDown >= bandThreshold) {
            include = true
          }
        }

        if (!include) {
          const dLeft = Math.abs(childWeight - f(childX - width, childY))
          if (dLeft >= bandThreshold) {
            const dRight = Math.abs(childWeight - f(childX + width, childY))
            if (dRight >= bandThreshold) {
              include = true
            }
          }
        }

        if (include) {
          connections.push({
            node: toNode(childX, childY),
            edge: childWeight,
          })
        }
      }
      if (variance > varianceThreshold) {
        childrenToExpand.push(child)
      }
    }
  }

  extractPointsInto(
    f: WeightFn,
    connections: PointEdge[],
    deltaWeight: number,
    childrenToExpand: QuadPoint[]
  ): void {
    this.extractInternal(
      f,
      connections,
      deltaWeight,
      (x, y) => [x, y],
      childrenToExpand
    )
  }

  extractPoints(
    f: WeightFn,
    connections: PointEdge[],
    deltaWeight: number
  ): QuadPoint[] {
    const childrenToExpand: QuadPoint[] = []
    this.extractPointsInto(f, connections, deltaWeight, childrenToExpand)
    return childrenToExpand
  }
}
