import { isActionEdge, Activation, isActionNode } from '@neat-js/core'
import { nodeRefToKey, type NodeRef, NodeType } from '@neat-js/core'
import { PhenotypeActionType } from '@neat-js/phenotype'
import type {
  Phenotype,
  PhenotypeAction,
  PhenotypeFactory,
} from '@neat-js/phenotype'

import type { DefaultNEATGenome } from './DefaultNEATGenome.js'

export const createPhenotype: PhenotypeFactory<DefaultNEATGenome> = (
  genome: DefaultNEATGenome
): Phenotype => {
  // Sort genomes network topologically
  const order = new Set(genome.connections.sortTopologically())
  const nodes: NodeRef[] = []

  // Create array of all input node indexes, for insertion of neural network inputs
  const inputs: number[] = []
  const inputLength = new Set(genome.inputs.values()).size
  for (let i = 0; i < inputLength; i++) {
    inputs.push(i)
    // Prepend input nodes to extraction of hidden nodes from topological sorting
    nodes.push({ type: NodeType.Input, id: i })
  }

  for (const action of order) {
    if (isActionNode(action) && action[0].type === NodeType.Hidden) {
      nodes.push({ type: NodeType.Hidden, id: action[0].id })
    }
  }

  // Create array of all output node indexes, for extraction of neural network execution result
  const outputLength = new Set(genome.outputs.values()).size
  const outputs: number[] = []
  const offset = nodes.length
  for (let i = 0; i < outputLength; i++) {
    outputs.push(i + offset)
    // Append all output nodes
    nodes.push({ type: NodeType.Output, id: i })
  }

  // Create mapping from NodeRef to array index in Network's node array
  const nodeMapping = new Map()
  for (const [i, node] of nodes.entries()) {
    nodeMapping.set(nodeRefToKey(node), i)
  }

  // Map topologically sorted order to neural network actions
  const actions: PhenotypeAction[] = []
  for (const action of order) {
    if (isActionEdge(action)) {
      const [from, to, weight] = action
      actions.push({
        type: PhenotypeActionType.Link,
        from: nodeMapping.get(nodeRefToKey(from)) as number,
        to: nodeMapping.get(nodeRefToKey(to)) as number,
        weight,
      })
    } else {
      const [node] = action
      actions.push({
        type: PhenotypeActionType.Activation,
        node: nodeMapping.get(nodeRefToKey(node)) as number,
        bias: 0,
        activation:
          node.type === NodeType.Output
            ? genome.genomeOptions.outputActivation
            : Activation.Sigmoid,
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
