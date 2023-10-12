import {
  isActionNode,
  NodeType,
  type PhenotypeAction,
  nodeKeyToRefTuple,
  nodeTupleToKey,
  type NodeRefTuple,
  type PhenotypeFactory,
  isActionEdge,
  PhenotypeActionType,
} from '@neat-js/core'

import type { CPPNGenome } from './CPPNGenome.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'

export const createPhenotype: PhenotypeFactory<
  CPPNGenome<CPPNGenomeOptions>
> = (genome) => {
  // Sort genome's network topologically
  const order = new Set(genome.connections.sortTopologically())
  const nodes: NodeRefTuple[] = []

  // Create array of all input node indexes, for insertion of neural network inputs
  const inputLength = genome.inputs.size
  const inputs: number[] = new Array(inputLength)
  for (let i = 0; i < inputLength; i++) {
    inputs[i] = i
    // Prepend input nodes to extraction of hidden nodes from topological sorting
    nodes.push([NodeType.Input, i])
  }

  for (const action of order) {
    const node = nodeKeyToRefTuple(action[0])
    if (isActionNode(action) && node[0] === NodeType.Hidden) {
      nodes.push([NodeType.Hidden, node[1]])
    }
  }

  // Create vector of all output node indexes, for extraction of neural network execution result
  const outputLength = genome.outputs.size
  const outputs: number[] = new Array(outputLength)
  const offset = nodes.length
  if (genome.genomeOptions.padMissingOutputs) {
    for (let i = 0; i < outputLength; i++) {
      outputs[i] = i + offset
      // Append all output nodes
      nodes.push([NodeType.Output, i])
    }
  } else {
    // FIXME: what is the original code trying to do here? Why would output size not be correct?
    let i = 0
    for (const node of genome.outputs.values()) {
      outputs[i] = i + offset
      // Append all output nodes
      nodes.push([NodeType.Output, node.id])
      i++
    }
  }

  // Create mapping from NodeRef to array index in Network's node array
  const nodeMapping = new Map<string, number>()
  for (const [i, node] of nodes.entries()) {
    nodeMapping.set(nodeTupleToKey(node), i)
  }

  // Map topologically sorted order to neural network actions
  const actions: PhenotypeAction[] = []
  for (const action of order) {
    if (isActionEdge(action)) {
      const [from, to, weight] = action
      actions.push({
        type: PhenotypeActionType.Link,
        from: nodeMapping.get(from) as number,
        to: nodeMapping.get(to) as number,
        weight,
      })
    } else {
      const [node] = action
      actions.push({
        type: PhenotypeActionType.Activation,
        node: nodeMapping.get(node) as number,
        bias: genome.getBias(node),
        activation: genome.getActivation(node),
      })
    }
  }

  return {
    length: nodes.length,
    inputs,
    outputs,
    actions,
  }
}
