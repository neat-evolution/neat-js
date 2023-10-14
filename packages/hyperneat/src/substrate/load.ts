import type { HyperNEATGenomeOptions } from '../HyperNEATGenomeOptions.js'
import type { Substrate } from '../Substrate.js'

import { layeredFromLayers } from './layeredFromLayers.js'
import { parseHiddenNodes } from './parseHiddenNodes.js'
import { parseNodes } from './parseNodes.js'

export const load = (
  inputs: number,
  outputs: number,
  options: HyperNEATGenomeOptions
): Substrate => {
  const inputLayer = parseNodes(
    options.inputConfig,
    options.resolution,
    inputs,
    -1
  )
  const hiddenLayers = parseHiddenNodes(
    options.hiddenLayers,
    options.hiddenLayerSizes,
    options.resolution
  )
  const outputLayer = parseNodes(
    options.outputConfig,
    options.resolution,
    outputs,
    1
  )

  return layeredFromLayers(
    inputLayer,
    hiddenLayers,
    outputLayer,
    options.resolution
  )
}
