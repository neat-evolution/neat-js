import { horizontalRow, type Point } from '@neat-evolution/hyperneat'

import type { IOConfig } from '../DESHyperNEATGenomeOptions.js'

export const parseNodes = (
  conf: IOConfig,
  r: number,
  num: number
): Point[][] => {
  switch (conf) {
    case 'line': {
      return [horizontalRow(num, 0, r)]
    }
    case 'separate': {
      return Array(num).fill([[0, 0]])
    }
    default: {
      const result: Point[][] = []
      for (const points of conf) {
        const mappedPoints: Point[] = []
        for (const point of points) {
          mappedPoints.push([point[0] * r, point[1] * r])
        }
        result.push(mappedPoints)
      }
      return result
    }
  }
}
