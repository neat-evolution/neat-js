import {
  type NodeRef,
  Activation,
  NodeType,
  toNodeKey,
  type NodeKey,
} from '@neat-js/core'
import { type CPPNGenome, type CPPNGenomeOptions } from '@neat-js/cppn'

import { insertLink } from './insertLink.js'
import { splitLink } from './splitLink.js'

export const insertIdentity = async (
  genome: CPPNGenome<CPPNGenomeOptions>,
  outputId: number
): Promise<void> => {
  const outputNodeRef: NodeRef = { type: NodeType.Output, id: outputId }
  const outputNodeKey = toNodeKey(NodeType.Output, outputId)

  if (!genome.outputs.has(outputNodeKey)) {
    genome.outputs.set(
      outputNodeKey,
      genome.createNode(outputNodeRef, null, null)
    )
  }

  const inputRefs: [NodeKey, NodeKey, NodeKey, NodeKey] = [
    toNodeKey(NodeType.Input, 0),
    toNodeKey(NodeType.Input, 1),
    toNodeKey(NodeType.Input, 2),
    toNodeKey(NodeType.Input, 3),
  ]

  await Promise.all([
    insertLink(genome, inputRefs[0], outputNodeKey, 0.0),
    insertLink(genome, inputRefs[1], outputNodeKey, 0.0),
  ])

  const hiddenX = await splitLink(
    genome,
    inputRefs[0],
    outputNodeKey,
    7.5,
    7.5,
    Activation.Square,
    0.0
  )

  const hiddenY = await splitLink(
    genome,
    inputRefs[1],
    outputNodeKey,
    7.5,
    7.5,
    Activation.Square,
    0.0
  )

  await Promise.all([
    insertLink(genome, inputRefs[2], hiddenX, -7.5),
    insertLink(genome, inputRefs[3], hiddenY, -7.5),
  ])

  const outputNode = genome.outputs.get(outputNodeKey)
  if (outputNode == null) {
    throw new Error('Output node not found')
  }

  outputNode.activation = Activation.Gaussian
  outputNode.bias = 0.0
}
