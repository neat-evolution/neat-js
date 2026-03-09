import { type Connections, isActionEdge } from '@neat-evolution/core'

import type { Point } from '../Point.js'
import type { Substrate } from '../Substrate.js'
import {
  type SubstrateAction,
  SubstrateActionType,
} from '../SubstrateAction.js'

const createPointIndex = () => {
  const pointIdByX = new Map<number, Map<number, number>>()
  const pointById = new Map<number, Point>()
  let nextPointId = 0

  const getOrCreatePointId = (point: Point): number => {
    const [x, y] = point
    let yMap = pointIdByX.get(x)
    if (yMap == null) {
      yMap = new Map<number, number>()
      pointIdByX.set(x, yMap)
    }
    const existing = yMap.get(y)
    if (existing != null) return existing
    const id = nextPointId
    nextPointId++
    yMap.set(y, id)
    pointById.set(id, point)
    return id
  }

  return { pointById, getOrCreatePointId }
}

export const createSubstrate = (
  inputs: Point[],
  hiddens: Point[],
  outputs: Point[],
  connections: Connections<number, null>,
  r: number
): Substrate => {
  const pointIndex = createPointIndex()
  const nodeMapping = new Map<number, number>()

  let index = 0
  for (const pointArray of [inputs, hiddens, outputs]) {
    for (const point of pointArray) {
      const pointId = pointIndex.getOrCreatePointId(point)
      nodeMapping.set(pointId, index)
      index++
    }
  }

  const order = new Set(connections.sortTopologically())
  // Map topologically sorted order to neural network actions
  const actions: SubstrateAction[] = []
  for (const action of order.values()) {
    if (isActionEdge(action)) {
      const [from, to] = action
      const fromPoint = pointIndex.pointById.get(from) as Point
      const toPoint = pointIndex.pointById.get(to) as Point
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
      const nodePoint = pointIndex.pointById.get(node) as Point
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

export const createLayeredSubstrateFromLayers = (
  layers: Point[][],
  r: number
): Substrate => {
  if (layers.length < 2) {
    throw new Error('at least input and output layers are required')
  }

  const inputs = layers[0] ?? []
  const outputs = layers[layers.length - 1] ?? []
  const layerOffsets = new Array<number>(layers.length)
  let nodeCount = 0
  let linkCount = 0
  let hiddenCount = 0
  for (let i = 0; i < layers.length; i++) {
    const layerLength = (layers[i] ?? []).length
    layerOffsets[i] = nodeCount
    nodeCount += layerLength
    if (i !== 0 && i !== layers.length - 1) hiddenCount += layerLength
    if (i + 1 < layers.length) {
      linkCount += layerLength * (layers[i + 1] ?? []).length
    }
  }

  const inverseR = 1 / r
  const actions = new Array<SubstrateAction>(nodeCount + linkCount)
  let actionIndex = 0

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i] ?? []
    const layerOffset = layerOffsets[i] as number

    // Activate current layer nodes.
    for (let j = 0; j < layer.length; j++) {
      const point = layer[j] as Point
      actions[actionIndex++] = {
        type: SubstrateActionType.Activation,
        node: layerOffset + j,
        x: point[0] * inverseR,
        y: point[1] * inverseR,
      }
    }

    // Emit fully-connected links to next layer.
    if (i + 1 < layers.length) {
      const nextLayer = layers[i + 1] ?? []
      const nextLayerOffset = layerOffsets[i + 1] as number
      for (let a = 0; a < layer.length; a++) {
        const from = layer[a] as Point
        const fromX = from[0] * inverseR
        const fromY = from[1] * inverseR
        const fromNode = layerOffset + a
        for (let b = 0; b < nextLayer.length; b++) {
          const to = nextLayer[b] as Point
          actions[actionIndex++] = {
            type: SubstrateActionType.Link,
            from: fromNode,
            to: nextLayerOffset + b,
            x0: fromX,
            y0: fromY,
            x1: to[0] * inverseR,
            y1: to[1] * inverseR,
          }
        }
      }
    }
  }

  const inputIndexes = new Array<number>(inputs.length)
  for (let i = 0; i < inputs.length; i++) inputIndexes[i] = i

  const outputsStart = inputs.length + hiddenCount
  const outputIndexes = new Array<number>(outputs.length)
  for (let i = 0; i < outputs.length; i++) outputIndexes[i] = outputsStart + i

  return {
    length: nodeCount,
    inputs: inputIndexes,
    outputs: outputIndexes,
    actions,
  }
}
