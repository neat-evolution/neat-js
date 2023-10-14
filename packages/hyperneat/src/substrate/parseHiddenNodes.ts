import type { Point } from '../Point.js'

import { horizontalRows } from './horizontalRows.js'

export const parseHiddenNodes = (
  hiddenLayers: Point[][] | null,
  hiddenLayerSizes: number[],
  r: number
): Point[][] => {
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
