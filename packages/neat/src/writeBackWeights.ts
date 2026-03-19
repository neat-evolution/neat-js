import {
  isActionEdge,
  isActionNode,
  type PhenotypeAction,
  PhenotypeActionType,
  toLinkKey,
} from '@neat-evolution/core'

import type { NEATGenome } from './NEATGenome.js'

/**
 * Write trained phenotype weights back to the genome's links and node biases.
 *
 * Walks the topological order (matching the phenotype action order)
 * and updates each link's weight and each node's bias.
 */
export const writeBackWeights = (
  genome: NEATGenome,
  updatedActions: PhenotypeAction[]
): void => {
  const order = genome.connections.sortTopologically()

  for (let i = 0; i < order.length; i++) {
    const action = order[i] as (typeof order)[number]
    const updated = updatedActions[i]

    if (
      isActionEdge(action) &&
      updated &&
      updated[0] === PhenotypeActionType.Link
    ) {
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
      updated &&
      updated[0] === PhenotypeActionType.Activation
    ) {
      const [nodeKey] = action
      const trainedBias = updated[2] as number
      const node = genome.getNodeByKey(nodeKey)
      if (node) {
        node.bias = trainedBias
      }
    }
  }
}
