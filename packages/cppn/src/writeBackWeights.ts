import {
  isActionEdge,
  isActionNode,
  type PhenotypeAction,
  PhenotypeActionType,
  toLinkKey,
} from '@neat-evolution/core'

import type { CPPNGenome } from './CPPNGenome.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'

/**
 * Write trained phenotype weights and biases back to the genome.
 *
 * CPPN genomes have per-node bias (`CPPNNode.bias`), so this writes back
 * both link weights (from Link actions) and node biases (from Activation actions).
 */
export const writeBackWeights = (
  genome: CPPNGenome<CPPNGenomeOptions>,
  updatedActions: PhenotypeAction[]
): void => {
  const order = genome.connections.sortTopologically()

  for (let i = 0; i < order.length; i++) {
    const action = order[i] as (typeof order)[number]
    const updated = updatedActions[i]
    if (!updated) continue

    if (isActionEdge(action) && updated[0] === PhenotypeActionType.Link) {
      const [fromKey, toKey] = action
      const trainedWeight = updated[3] as number
      const linkKey = toLinkKey(fromKey, toKey)
      const link = genome.links.get(linkKey)
      if (link) {
        link.weight = trainedWeight
      }
      genome.connections.setEdge(fromKey, toKey, trainedWeight)
    } else if (
      isActionNode(action) &&
      updated[0] === PhenotypeActionType.Activation
    ) {
      const [nodeKey] = action
      const trainedBias = updated[2] as number
      const node =
        genome.hiddenNodes.get(nodeKey) ??
        genome.outputs.get(nodeKey) ??
        genome.inputs.get(nodeKey)
      if (node) {
        node.bias = trainedBias
      }
    }
  }
}
