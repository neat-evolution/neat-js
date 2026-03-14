import {
  isActionEdge,
  isActionNode,
  type NodeKey,
  NodeType,
  nodeKeyToType,
  type Phenotype,
  type PhenotypeAction,
  PhenotypeActionType,
  type PhenotypeFactory,
  resolveOutputActivation,
  toNodeKey,
} from '@neat-evolution/core'
import type { NEATContext } from './NEATContext.js'
import type { NEATGenome } from './NEATGenome.js'

export const createPhenotype: PhenotypeFactory<NEATGenome, NEATContext> = (
  genome: NEATGenome
): Phenotype => {
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
    const node = action[0]
    if (isActionNode(action) && nodeKeyToType(node) === NodeType.Hidden) {
      nodeMapping.set(node, inputLength + hiddenCount)
      hiddenCount++
    }
  }

  const outputLength = genome.outputs.size
  const outputs: number[] = new Array(outputLength)
  const offset = inputLength + hiddenCount
  for (let i = 0; i < outputLength; i++) {
    outputs[i] = i + offset
    nodeMapping.set(toNodeKey(NodeType.Output, i), i + offset)
  }

  // Map output node keys to their output index for per-group activation
  const outputIndexByNode = new Map<NodeKey, number>()
  for (let i = 0; i < outputLength; i++) {
    outputIndexByNode.set(toNodeKey(NodeType.Output, i), i)
  }

  const hiddenActivation = genome.genomeOptions.hiddenActivation
  const outputActivationSpec = genome.genomeOptions.outputActivation
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
      const outputIndex = outputIndexByNode.get(node)
      actions[i] = [
        PhenotypeActionType.Activation,
        nodeMapping.get(node) as number,
        0,
        outputIndex !== undefined
          ? resolveOutputActivation(outputActivationSpec, outputIndex)
          : hiddenActivation,
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
