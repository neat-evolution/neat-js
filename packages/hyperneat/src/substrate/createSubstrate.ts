import { isActionEdge, type Connections } from '@neat-js/core'

import {
  toPointKey,
  type Point,
  type PointKey,
  fromPointKey,
} from '../Point.js'
import type { Substrate } from '../Substrate.js'
import {
  SubstrateActionType,
  type SubstrateAction,
} from '../SubstrateAction.js'

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
