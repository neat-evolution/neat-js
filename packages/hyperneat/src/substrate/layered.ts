import { Connections } from '@neat-js/core'

import type { HyperNEATGenomeOptions } from '../HyperNEATGenomeOptions.js'
import { toPointKey, type Point, type PointKey } from '../Point.js'
import type { Substrate } from '../Substrate.js'

import { createSubstrate } from './createSubstrate.js'
import { horizontalRows } from './horizontalRows.js'

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
