import type { Target } from '@neat-js/core'
import { toPointKey, type PointKey } from '@neat-js/hyperneat'

import type { ESHyperNEATGenomeOptions } from '../ESHyperNEATGenomeOptions.js'

import type { WeightFn } from './findConnections.js'
import { quickSelectMedian } from './quickSelectMedian.js'

function isWeightNumber(value: WeightFn | number): value is number {
  return typeof value === 'number'
}

export class QuadPoint {
  public readonly x: number
  public readonly y: number
  public readonly width: number
  public readonly weight: number
  public readonly depth: number
  public variance: number
  public children: null | QuadPoint[]
  public readonly options: ESHyperNEATGenomeOptions

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
    this.weight = isWeightNumber(weightFn) ? weightFn : weightFn(x, y)
    this.depth = depth
    this.variance = 0.0
    this.children = null
    this.options = options
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
      for (const child of this.children.values()) {
        child.collectLeafWeights(weights, internal, internal)
      }
    }
  }

  calcVariance(deltaWeight: number, root: boolean, branch: boolean): number {
    if (deltaWeight === 0.0) {
      return 0.0
    }

    const weights: number[] = []
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
        sum += weights[i] as number
      }
      centroid = sum / len
    }

    for (const weight of weights) {
      const square = ((centroid - weight) / dw) ** 2
      sumSquares += square
      if (square > maxSquare) {
        maxSquare = square
      }
    }

    this.variance = this.options.maxVariance ? maxSquare : sumSquares / len

    return this.variance
  }

  /// Creates the four children of a node. Returns their min and max weight value.
  createChildren(f: WeightFn): [minWeight: number, maxWeight: number] {
    const width = this.width / 2.0
    const depth = this.depth + 1

    const child = (x: number, y: number) =>
      new QuadPoint(this.x + x, this.y + y, width, depth, f, this.options)

    this.children = [
      child(-width, -width),
      child(-width, width),
      child(width, width),
      child(width, -width),
    ]

    let minWeight = Infinity
    let maxWeight = -Infinity

    for (const child of this.children) {
      if (child.weight < minWeight) {
        minWeight = child.weight
      }
      if (child.weight > maxWeight) {
        maxWeight = child.weight
      }
    }

    return [minWeight, maxWeight]
  }

  /// Yields all children if this parent (self) should be expanded
  *expand(deltaWeight: number): Iterable<QuadPoint> {
    const expand =
      this.depth + 1 < this.options.initialResolution ||
      (this.depth + 1 < this.options.maxResolution &&
        this.calcVariance(deltaWeight, true, true) >
          this.options.divisionThreshold)

    if (expand && this.children !== null && this.children.length > 0) {
      for (let i = 0; i < Math.min(this.children.length, 4); i++) {
        yield this.children[i] as QuadPoint
      }
    }
  }

  /// Yields children with high variance. Pushes children with low
  /// variance to connections, if their band value is above band threshold.
  *extract(
    f: WeightFn,
    connections: Array<Target<PointKey, number>>,
    deltaWeight: number
  ): Iterable<QuadPoint> {
    const width = this.width

    if (this.children === null) {
      return
    }
    for (const child of this.children) {
      if (
        child.calcVariance(deltaWeight, false, true) <=
        this.options.varianceThreshold
      ) {
        let bandValue: number
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
        } else {
          bandValue = 0.0
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
        yield child
      }
    }
  }
}
