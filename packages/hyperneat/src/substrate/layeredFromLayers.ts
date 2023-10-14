import { Connections } from '@neat-js/core'

import { toPointKey, type Point, type PointKey } from '../Point.js'
import type { Substrate } from '../Substrate.js'

import { createSubstrate } from './createSubstrate.js'

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
