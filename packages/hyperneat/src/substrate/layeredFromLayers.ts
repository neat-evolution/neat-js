import type { Point } from '../Point.js'
import type { Substrate } from '../Substrate.js'

import { createLayeredSubstrateFromLayers } from './createSubstrate.js'

export const layeredFromLayers = (
  inputs: Point[],
  hiddenLayers: Point[][],
  outputs: Point[],
  r: number
): Substrate => {
  const layers = [[...inputs], ...hiddenLayers, [...outputs]]
  return createLayeredSubstrateFromLayers(layers, r)
}
