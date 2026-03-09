import type { HyperNEATGenomeOptions } from '../HyperNEATGenomeOptions.js'
import type { Substrate } from '../Substrate.js'

import { createLayeredSubstrateFromLayers } from './createSubstrate.js'
import { horizontalRows } from './horizontalRows.js'

export const layered = (
  layerSizes: number[],
  options: HyperNEATGenomeOptions
): Substrate => {
  const layers = horizontalRows(layerSizes, options.resolution)
  return createLayeredSubstrateFromLayers(layers, options.resolution)
}
