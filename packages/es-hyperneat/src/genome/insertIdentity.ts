import { nodeRefToKey, type NodeRef, Activation, NodeType } from '@neat-js/core'
import {
  CPPNAlgorithm,
  type CPPNGenome,
  type CPPNGenomeOptions,
} from '@neat-js/cppn'

import { insertLink } from './insertLink.js'
import { splitLink } from './splitLink.js'

export const insertIdentity = (
  genome: CPPNGenome<CPPNGenomeOptions>,
  outputId: number
): void => {
  const outputNodeRef: NodeRef = { type: NodeType.Output, id: outputId }
  const outputNodeKey = nodeRefToKey(outputNodeRef)

  if (!genome.outputs.has(outputNodeKey)) {
    genome.outputs.set(
      outputNodeKey,
      CPPNAlgorithm.createNode(outputNodeRef, null, null)
    )
  }

  const inputRefs: [NodeRef, NodeRef, NodeRef, NodeRef] = [
    { type: NodeType.Input, id: 0 },
    { type: NodeType.Input, id: 1 },
    { type: NodeType.Input, id: 2 },
    { type: NodeType.Input, id: 3 },
  ]

  insertLink(genome, inputRefs[0], outputNodeRef, 0.0)
  insertLink(genome, inputRefs[1], outputNodeRef, 0.0)

  const hiddenX = splitLink(
    genome,
    inputRefs[0],
    outputNodeRef,
    7.5,
    7.5,
    Activation.Square,
    0.0
  )

  const hiddenY = splitLink(
    genome,
    inputRefs[1],
    outputNodeRef,
    7.5,
    7.5,
    Activation.Square,
    0.0
  )

  insertLink(genome, inputRefs[2], hiddenX, -7.5)
  insertLink(genome, inputRefs[3], hiddenY, -7.5)

  const outputNode = genome.outputs.get(outputNodeKey)
  if (outputNode == null) {
    throw new Error('Output node not found')
  }

  outputNode.activation = Activation.Gaussian
  outputNode.bias = 0.0
}
