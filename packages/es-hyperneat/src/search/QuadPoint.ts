import type { Target } from '@neat-evolution/core'
import { type PointKey, toPointKey } from '@neat-evolution/hyperneat'

import type { ESHyperNEATGenomeOptions } from '../ESHyperNEATGenomeOptions.js'

import type { WeightFn } from './findConnections.js'
import { quickSelectMedian } from './quickSelectMedian.js'

function isWeightNumber(value: WeightFn | number): value is number {
  return typeof value === 'number'
}

export class QuadPoint {
  private static pool: QuadPoint[] = []
  private static weightsPool: number[] = []

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
    const point = this.pool.pop()
    if (point) {
      point.x = x
      point.y = y
      point.width = width
      point.depth = depth
      point.options = options
      point.weight = isWeightNumber(weightFn) ? weightFn : weightFn(x, y)
      point.variance = 0.0
      point.children = null
      return point
    }
    return new QuadPoint(x, y, width, depth, weightFn, options)
  }

  public static release(point: QuadPoint): void {
    if (point.children) {
      for (let i = 0; i < point.children.length; i++) {
        const child = point.children[i]
        if (child) this.release(child)
      }
    }
    point.children = null
    this.pool.push(point)
  }

  /// Collect weight of all nodes in tree. If root is true, collect the root's weight. If
  /// internal is true, collect all internal node weights. Always collect leaf node weights.
  collectLeafWeights(
    weights: number[],
    root: boolean,
    internal: boolean
  ): void {
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
      // median weight
      centroid = quickSelectMedian([...weights])
    } else {
      // mean weight
      let sum = 0
      for (let i = 0; i < len; i++) {
        sum += weights[i]!
      }
      centroid = sum / len
    }

    for (let i = 0; i < len; i++) {
      const weight = weights[i]!
      const square = ((centroid - weight) / dw) ** 2
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
      QuadPoint.acquire(this.x - width, this.y - width, width, depth, f, this.options),
      QuadPoint.acquire(this.x - width, this.y + width, width, depth, f, this.options),
      QuadPoint.acquire(this.x + width, this.y + width, width, depth, f, this.options),
      QuadPoint.acquire(this.x + width, this.y - width, width, depth, f, this.options),
    ]

    const child0 = this.children[0]!
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
  extract(
    f: WeightFn,
    connections: Array<Target<PointKey, number>>,
    deltaWeight: number
  ): QuadPoint[] {
    const childrenToExpand: QuadPoint[] = []
    if (this.children === null) {
      return childrenToExpand
    }

    const width = this.width
    for (let i = 0; i < 4; i++) {
      const child = this.children[i]
      if (child === undefined) continue

      if (
        child.calcVariance(deltaWeight, false, true) <=
        this.options.varianceThreshold
      ) {
        let bandValue = 0.0
        if (this.options.bandThreshold > 0.0) {
          const leftMinus = f(child.x - width, child.y)
          const rightMinus = f(child.x + width, child.y)
          const upMinus = f(child.x, child.y - width)
          const downMinus = f(child.x, child.y + width)

          const dLeft = Math.abs(child.weight - leftMinus)
          const dRight = Math.abs(child.weight - rightMinus)
          const dUp = Math.abs(child.weight - upMinus)
          const dDown = Math.abs(child.weight - downMinus)
          bandValue = Math.max(Math.min(dUp, dDown), Math.min(dLeft, dRight))
        }
        
        if (bandValue >= this.options.bandThreshold) {
          connections.push({
            node: toPointKey([child.x, child.y]),
            edge: child.weight,
          })
        }
      }
      // Use stored variance
      if (child.variance > this.options.varianceThreshold) {
        childrenToExpand.push(child)
      }
    }
    return childrenToExpand
  }
}
