import { type NodeKey, type Activation, toLinkKey } from '@neat-evolution/core'
import { type CPPNGenome, type CPPNGenomeOptions } from '@neat-evolution/cppn'

export const splitLink = async (
  genome: CPPNGenome<CPPNGenomeOptions>,
  from: NodeKey,
  to: NodeKey,
  weight: number,
  weight2: number,
  activation: Activation,
  bias: number
): Promise<NodeKey> => {
  const linkKey = toLinkKey(from, to)
  const existingLink = genome.links.get(linkKey)
  if (existingLink == null) {
    throw new Error('Cannot split non-existing link')
  }
  const newNodeKey = await genome.state.getSplitInnovation(
    existingLink.innovation
  )

  await genome.splitLink(from, to, newNodeKey)

  const hiddenNode = genome.hiddenNodes.get(newNodeKey)
  if (hiddenNode == null) {
    throw new Error('Hidden node not found')
  }

  hiddenNode.activation = activation
  hiddenNode.bias = bias

  const newSourceKey = toLinkKey(from, newNodeKey)
  const newTargetKey = toLinkKey(newNodeKey, to)

  const newSourceLink = genome.links.get(newSourceKey)
  const newTargetLink = genome.links.get(newTargetKey)

  if (newSourceLink == null || newTargetLink == null) {
    throw new Error('Link not found')
  }

  newSourceLink.weight = weight
  newTargetLink.weight = weight2

  return newNodeKey
}
