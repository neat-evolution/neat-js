import { isActionEdge, Connections } from '@neat-js/core'

import type {
  HyperNEATGenomeOptions,
  IOConfig,
} from './HyperNEATGenomeOptions.js'
import { type Point, type PointKey, toPointKey, fromPointKey } from './Point.js'
import { SubstrateActionType, type SubstrateAction } from './SubstrateAction.js'

export interface Substrate {
  length: number
  inputs: number[]
  outputs: number[]
  actions: SubstrateAction[]
}

export const load = (
  inputs: number,
  outputs: number,
  options: HyperNEATGenomeOptions
): Substrate => {
  const inputLayer = parseNodes(
    options.inputConfig,
    options.resolution,
    inputs,
    -1
  )
  const hiddenLayers = parseHiddenNodes(
    options.hiddenLayers,
    options.hiddenLayerSizes,
    options.resolution
  )
  const outputLayer = parseNodes(
    options.outputConfig,
    options.resolution,
    outputs,
    1
  )

  return layeredFromLayers(
    inputLayer,
    hiddenLayers,
    outputLayer,
    options.resolution
  )
}

export const layered = (
  layerSizes: number[],
  options: HyperNEATGenomeOptions
): Substrate => {
  const layers = horizontalRows(layerSizes, options.resolution)

  const connections = new Connections<PointKey, null>()
  for (let i = 0; i < layers.length - 1; i++) {
    const points = layers[i] as Point[]
    const nextPoints = layers[i + 1] as Point[]
    for (const from of points) {
      for (const to of nextPoints) {
        try {
          connections.add(toPointKey(from), toPointKey(to), null)
        } catch (e) {
          console.error(e)
        }
      }
    }
  }

  const inputs = layers[0] as Point[]
  const outputs = layers[layers.length - 1] as Point[]
  const hiddenLayers: Point[] = []
  for (let i = 1; i < layers.length - 1; i++) {
    hiddenLayers.push(...(layers[i] as Point[]))
  }

  return createSubstrate(
    inputs,
    hiddenLayers,
    outputs,
    connections,
    options.resolution
  )
}

export const layeredFromLayers = (
  inputs: Point[],
  hiddenLayers: Point[][],
  outputs: Point[],
  r: number
): Substrate => {
  const layers = [[...inputs], ...hiddenLayers, [...outputs]]

  const connections = new Connections<PointKey, null>()
  for (let i = 0; i < layers.length - 1; i++) {
    const points = layers[i] as Point[]
    const nextPoints = layers[i + 1] as Point[]
    for (const from of points) {
      for (const to of nextPoints) {
        try {
          connections.add(toPointKey(from), toPointKey(to), null)
        } catch (e) {
          console.error(e)
        }
      }
    }
  }

  const hiddenFlat: Point[] = []
  for (const layer of hiddenLayers) {
    hiddenFlat.push(...layer)
  }

  return createSubstrate(inputs, hiddenFlat, outputs, connections, r)
}

export const createSubstrate = (
  inputs: Point[],
  hiddens: Point[],
  outputs: Point[],
  connections: Connections<PointKey, null>,
  r: number
): Substrate => {
  // Create mapping from Point to array index in Network's node vector
  const nodeMapping = new Map<PointKey, number>()

  let index = 0
  for (const pointArray of [inputs, hiddens, outputs]) {
    for (const point of pointArray) {
      nodeMapping.set(toPointKey(point), index)
      index++
    }
  }

  const order = new Set(connections.sortTopologically())
  // Map topologically sorted order to neural network actions
  const actions: SubstrateAction[] = []
  for (const action of order.values()) {
    if (isActionEdge(action)) {
      const [from, to] = action
      const fromPoint = fromPointKey(from)
      const toPoint = fromPointKey(to)
      actions.push({
        type: SubstrateActionType.Link,
        from: nodeMapping.get(from) as number,
        to: nodeMapping.get(to) as number,
        x0: fromPoint[0] / r,
        y0: fromPoint[1] / r,
        x1: toPoint[0] / r,
        y1: toPoint[1] / r,
      })
    } else {
      const [node] = action
      const nodePoint = fromPointKey(node)
      actions.push({
        type: SubstrateActionType.Activation,
        node: nodeMapping.get(node) as number,
        x: nodePoint[0] / r,
        y: nodePoint[1] / r,
      })
    }
  }
  const nonOutputCount = inputs.length + hiddens.length

  return {
    length: nodeMapping.size,
    inputs: Array.from({ length: inputs.length }, (_, i) => i),
    outputs: Array.from(
      { length: outputs.length },
      (_, i) => i + nonOutputCount
    ),
    actions,
  }
}

function horizontalRow(n: number, y: number, r: number): Point[] {
  if (n === 1) {
    return [[0, y]]
  }

  const horizontalDistance = n > 1 ? (2 * r) / (n - 1) : 0
  const offset = n > 1 ? r : 0

  const points: Point[] = []
  for (let i = 0; i < n; i++) {
    points.push([Math.floor(horizontalDistance * i) - offset, y])
  }

  return points
}

function horizontalRows(layerSizes: number[], r: number): Point[][] {
  const verticalDistance =
    layerSizes.length > 1 ? (2 * r) / (layerSizes.length - 1) : 0
  const offset = layerSizes.length > 1 ? r : 0

  const layers: Point[][] = []
  for (const [j, n] of layerSizes.entries()) {
    layers.push(horizontalRow(n, Math.floor(verticalDistance * j) - offset, r))
  }

  return layers
}

function parseNodes(
  conf: IOConfig,
  r: number,
  num: number,
  y: number
): Point[] {
  if (conf === 'line') {
    return horizontalRow(num, Math.floor(r * y), r)
  }

  const points: Point[] = []
  for (const point of conf) {
    points.push([Math.floor(point[0] * r), Math.floor(point[1] * r)])
  }

  return points
}

function parseHiddenNodes(
  hiddenLayers: Point[][] | null,
  hiddenLayerSizes: number[],
  r: number
): Point[][] {
  if (hiddenLayers !== null) {
    const layers: Point[][] = []
    for (const points of hiddenLayers) {
      const layer: Point[] = []
      for (const point of points) {
        layer.push([Math.floor(point[0] * r), Math.floor(point[1] * r)])
      }
      layers.push(layer)
    }
    return layers
  }

  const clonedLayerSizes: number[] = [...hiddenLayerSizes]

  // Insert dummy I/O layers to space hidden layers vertically
  clonedLayerSizes.unshift(0)
  clonedLayerSizes.push(0)

  return horizontalRows(clonedLayerSizes, r).slice(1, -1)
}
