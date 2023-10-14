import type { IOConfig } from '../HyperNEATGenomeOptions.js'
import type { Point } from '../Point.js'

import { horizontalRow } from './horizontalRows.js'

export const parseNodes = (
  conf: IOConfig,
  r: number,
  num: number,
  y: number
): Point[] => {
  if (conf === 'line') {
    return horizontalRow(num, Math.floor(r * y), r)
  }

  const points: Point[] = []
  for (const point of conf) {
    points.push([Math.floor(point[0] * r), Math.floor(point[1] * r)])
  }

  return points
}
