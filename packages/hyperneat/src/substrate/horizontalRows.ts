import type { Point } from '../Point.js'

export const horizontalRow = (n: number, y: number, r: number): Point[] => {
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

export const horizontalRows = (layerSizes: number[], r: number): Point[][] => {
  const verticalDistance =
    layerSizes.length > 1 ? (2 * r) / (layerSizes.length - 1) : 0
  const offset = layerSizes.length > 1 ? r : 0

  const layers: Point[][] = []
  for (const [j, n] of layerSizes.entries()) {
    layers.push(horizontalRow(n, Math.floor(verticalDistance * j) - offset, r))
  }

  return layers
}
