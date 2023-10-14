import {
  nodeRefToKey,
  type NodeRef,
  type Activation,
  nodeRefsToLinkKey,
  type NodeRefTuple,
  NodeType,
  nodeTupleToKey,
  toLinkKey,
} from '@neat-js/core'
import {
  type CPPNGenome,
  type CPPNGenomeOptions,
  type CPPNNode,
} from '@neat-js/cppn'

export const splitLink = (
  genome: CPPNGenome<CPPNGenomeOptions>,
  from: NodeRef,
  to: NodeRef,
  weight: number,
  weight2: number,
  activation: Activation,
  bias: number
): CPPNNode => {
  const linkKey = nodeRefsToLinkKey(from, to)
  const existingLink = genome.links.get(linkKey)
  if (existingLink == null) {
    throw new Error('Cannot split non-existing link')
  }

  const innovation = genome.state.getSplitInnovation(existingLink.innovation)
  const newNodeRefTuple: NodeRefTuple = [NodeType.Hidden, innovation.nodeNumber]
  const newNodeKey = nodeTupleToKey(newNodeRefTuple)
  const fromKey = nodeRefToKey(from)
  const toKey = nodeRefToKey(to)
  genome.splitLink(
    fromKey,
    toKey,
    innovation.nodeNumber,
    innovation.innovationNumber
  )

  const hiddenNode = genome.hiddenNodes.get(newNodeKey)
  if (hiddenNode == null) {
    throw new Error('Hidden node not found')
  }

  hiddenNode.activation = activation
  hiddenNode.bias = bias

  const fromToNewKey = toLinkKey(fromKey, newNodeKey)
  const newToToKey = toLinkKey(newNodeKey, toKey)

  const fromToNewLink = genome.links.get(fromToNewKey)
  const newToToLink = genome.links.get(newToToKey)

  if (fromToNewLink == null || newToToLink == null) {
    throw new Error('Link not found')
  }

  fromToNewLink.weight = weight
  newToToLink.weight = weight2

  return hiddenNode
}
