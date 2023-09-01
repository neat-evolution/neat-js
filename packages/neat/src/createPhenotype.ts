import { isOrderedActionEdge, Activation } from '@neat-js/core'
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
  const order = genome.connections.sortTopologically()
  const nodes: NodeRef[] = []

  // Create array of all input node indexes, for insertion of neural network inputs
  let maxInputNode = -1
  for (const node of genome.inputs.values()) {
    if (node.id > maxInputNode) {
      maxInputNode = node.id
    }
  }
  const numInputNodes = maxInputNode + 1
  const inputs: number[] = []

  for (let i = 0; i < numInputNodes; i++) {
    inputs.push(i)
    // Prepend input nodes to extraction of hidden nodes from topological sorting
    nodes.push({ type: NodeType.Input, id: i })
  }

  for (const action of order) {
    if (action[0].type === NodeType.Hidden) {
      nodes.push(action[0])
    }
  }

  // Create array of all output node indexes, for extraction of neural network execution result
  let maxOutputNode = -1
  for (const node of genome.outputs.values()) {
    if (node.id > maxOutputNode) {
      maxOutputNode = node.id
    }
  }
  const numOutputNodes = maxOutputNode + 1
  const outputs: number[] = []
  const offset = nodes.length
  for (let i = 0; i < numOutputNodes; i++) {
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
    if (isOrderedActionEdge(action)) {
      const [from, to, weight] = action
      if (to === undefined) {
        throw new Error('Invalid action')
      }
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
            ? genome.options.outputActivation
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
