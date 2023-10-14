import type { Target } from '@neat-js/core'
import { toPointKey, type PointKey } from '@neat-js/hyperneat'

import type { ESHyperNEATGenomeOptions } from '../ESHyperNEATGenomeOptions.js'

import type { WeightFn } from './findConnections.js'
import { quickSelectMedian } from './quickSelectMedian.js'

export class QuadPoint {
  x: number
  y: number
  width: number
  weight: number
  depth: number
  variance: number
  children: QuadPoint[]
  options: ESHyperNEATGenomeOptions

  constructor(
    x: number,
    y: number,
    width: number,
    depth: number,
    f: WeightFn,
    options: ESHyperNEATGenomeOptions
  ) {
    this.x = x
    this.y = y
    this.width = width
    this.weight = f(x, y)
    this.depth = depth
    this.variance = 0.0
    this.children = []
    this.options = options
  }

  /// Collect weight of all nodes in tree. If root is true, collect the root's weight. If
  /// internal is true, collect all internal node weights. Always collect leaf node weights.
  collectLeafWeights(
    weights: number[],
    root: boolean,
    internal: boolean
  ): void {
    if (
      (root && !this.options.onlyLeafVariance) ||
      this.children.length === 0
    ) {
      weights.push(this.weight)
    }
    for (const child of this.children.values()) {
      child.collectLeafWeights(weights, internal, internal)
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
  createChildren(f: WeightFn): [number, number] {
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

    if (expand && this.children.length > 0) {
      for (const child of this.children) {
        yield child
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

    for (const child of this.children) {
      if (
        child.calcVariance(deltaWeight, false, true) <=
        this.options.varianceThreshold
      ) {
        const bandValue =
          this.options.bandThreshold > 0.0
            ? Math.max(
                Math.min(
                  Math.abs(child.weight - f(child.x - width, child.y)),
                  Math.abs(child.weight - f(child.x + width, child.y))
                ),
                Math.min(
                  Math.abs(child.weight - f(child.x, child.y - width)),
                  Math.abs(child.weight - f(child.x, child.y + width))
                )
              )
            : 0.0

        if (bandValue >= this.options.bandThreshold) {
          connections.push({
            node: toPointKey([child.x, child.y]),
            edge: child.weight,
          })
        }
      }
    }

    // Use stored variance calculated in the previous loop
    for (const child of this.children.values()) {
      if (child.variance > this.options.varianceThreshold) {
        yield child
      }
    }
  }
}
