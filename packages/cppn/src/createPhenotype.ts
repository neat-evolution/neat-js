import {
  isActionNode,
  NodeType,
  type PhenotypeAction,
  type PhenotypeFactory,
  isActionEdge,
  PhenotypeActionType,
  type NodeKey,
  toNodeKey,
  nodeKeyToType,
} from '@neat-evolution/core'

import type { CPPNGenome } from './CPPNGenome.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import type { CPPNNode } from './CPPNNode.js'

export const createPhenotype: PhenotypeFactory<
  CPPNGenome<CPPNGenomeOptions>
> = (genome) => {
  // Sort genome's network topologically
  const order = new Set(genome.connections.sortTopologically())
  const nodes: NodeKey[] = []

  // Create array of all input node indexes, for insertion of neural network inputs
  const inputLength = genome.inputs.size
  const inputs: number[] = new Array(inputLength)
  for (let i = 0; i < inputLength; i++) {
    inputs[i] = i
    // Prepend input nodes to extraction of hidden nodes from topological sorting
    nodes.push(toNodeKey(NodeType.Input, i))
  }

  for (const action of order) {
    const nodeType = nodeKeyToType(action[0])
    if (isActionNode(action) && nodeType === NodeType.Hidden) {
      nodes.push(action[0])
    }
  }

  // Create vector of all output node indexes, for extraction of neural network execution result
  const outputLength = genome.outputs.size
  const outputs: number[] = new Array(outputLength)
  const offset = nodes.length
  if (genome.genomeOptions.padMissingOutputs) {
    for (let i = 0; i < outputLength; i++) {
      outputs[i] = i + offset
      nodes.push(toNodeKey(NodeType.Output, i))
    }
  } else {
    const outputNodes = Array.from(genome.outputs.values())
    outputNodes.sort((a, b) => {
      if (typeof a.id === 'number' && typeof b.id === 'number') {
        return a.id - b.id
      } else if (typeof a.id === 'string' && typeof b.id === 'string') {
        return a.id.localeCompare(b.id)
      } else {
        return 0
      }
    })
    for (let i = 0; i < outputNodes.length; i++) {
      const node = outputNodes[i] as CPPNNode
      outputs[i] = i + offset
      nodes.push(toNodeKey(NodeType.Output, node.id))
    }
  }

  // Create mapping from NodeRef to array index in Network's node array
  const nodeMapping = new Map<string, number>()
  let i = 0
  for (const node of nodes) {
    nodeMapping.set(node, i)
    i++
  }

  // Map topologically sorted order to neural network actions
  const actions: PhenotypeAction[] = []
  for (const action of order) {
    if (isActionEdge(action)) {
      const [from, to, weight] = action
      actions.push([
        PhenotypeActionType.Link,
        nodeMapping.get(from) as number,
        nodeMapping.get(to) as number,
        weight,
      ])
    } else {
      const [node] = action
      actions.push([
        PhenotypeActionType.Activation,
        nodeMapping.get(node) as number,
        genome.getBias(node),
        genome.getActivation(node),
      ])
    }
  }

  return {
    length: nodes.length,
    inputs,
    outputs,
    actions,
  }
}
