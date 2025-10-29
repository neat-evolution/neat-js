import {
  isActionEdge,
  isActionNode,
  NodeType,
  type Phenotype,
  type PhenotypeAction,
  type PhenotypeFactory,
  type NodeRefTuple,
  nodeKeyToRefTuple,
  nodeTupleToKey,
} from '@neat-evolution/core'
import { PhenotypeActionType } from '@neat-evolution/core'

import type { NEATGenome } from './NEATGenome.js'

export const createPhenotype: PhenotypeFactory<NEATGenome> = (
  genome: NEATGenome
): Phenotype => {
  // Sort genomes network topologically
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

  // Create array of all output node indexes, for extraction of neural network execution result
  const outputLength = genome.outputs.size
  const outputs: number[] = new Array(outputLength)
  const offset = nodes.length
  for (let i = 0; i < outputLength; i++) {
    outputs[i] = i + offset
    // Append all output nodes
    nodes.push([NodeType.Output, i])
  }

  // Create mapping from NodeRef to array index in Network's node array
  const nodeMapping = new Map()
  for (const [i, node] of nodes.entries()) {
    nodeMapping.set(nodeTupleToKey(node), i)
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
        0,
        node[0] === NodeType.Output
          ? genome.genomeOptions.outputActivation
          : genome.genomeOptions.hiddenActivation,
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
