import {
  isActionEdge,
  isActionNode,
  type NodeKey,
  NodeType,
  nodeKeyToType,
  type PhenotypeAction,
  PhenotypeActionType,
  type PhenotypeFactory,
  toNodeKey,
} from '@neat-evolution/core'
import type { CPPNContext } from './CPPNContext.js'
import type { CPPNGenome } from './CPPNGenome.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import type { CPPNNode } from './CPPNNode.js'

export const createPhenotype: PhenotypeFactory<
  CPPNGenome<CPPNGenomeOptions>,
  CPPNContext<CPPNGenomeOptions>
> = (genome) => {
  const order = genome.connections.sortTopologically()

  const inputLength = genome.inputs.size
  const inputs: number[] = new Array(inputLength)
  const nodeMapping = new Map<NodeKey, number>()
  for (let i = 0; i < inputLength; i++) {
    inputs[i] = i
    nodeMapping.set(toNodeKey(NodeType.Input, i), i)
  }

  let hiddenCount = 0
  for (const action of order) {
    if (isActionNode(action) && nodeKeyToType(action[0]) === NodeType.Hidden) {
      nodeMapping.set(action[0], inputLength + hiddenCount)
      hiddenCount++
    }
  }

  const outputLength = genome.outputs.size
  const outputs: number[] = new Array(outputLength)
  const offset = inputLength + hiddenCount
  if (genome.genomeOptions.padMissingOutputs) {
    for (let i = 0; i < outputLength; i++) {
      outputs[i] = i + offset
      nodeMapping.set(toNodeKey(NodeType.Output, i), i + offset)
    }
  } else {
    const outputNodes = Array.from(genome.outputs.values())
    outputNodes.sort((a, b) => a.id - b.id)
    let i = 0
    for (const node of outputNodes) {
      outputs[i] = i + offset
      nodeMapping.set(toNodeKey(NodeType.Output, node.id), i + offset)
      i++
    }
  }

  const actions: PhenotypeAction[] = new Array(order.length)
  for (let i = 0; i < order.length; i++) {
    const action = order[i] as (typeof order)[number]
    if (isActionEdge(action)) {
      const [from, to, weight] = action
      actions[i] = [
        PhenotypeActionType.Link,
        nodeMapping.get(from) as number,
        nodeMapping.get(to) as number,
        weight,
      ]
    } else {
      const [node] = action
      const phenotypeNode = genome.getNodeByKey(node) as CPPNNode
      actions[i] = [
        PhenotypeActionType.Activation,
        nodeMapping.get(node) as number,
        phenotypeNode.bias,
        phenotypeNode.activation,
      ]
    }
  }

  return {
    length: offset + outputLength,
    inputs,
    outputs,
    actions,
  }
}
