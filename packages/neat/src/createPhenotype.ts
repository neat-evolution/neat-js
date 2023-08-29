import { isOrderedActionEdge } from '@neat-js/core'
import { nodeRefsToLinkKey } from '@neat-js/core'
import { nodeRefToKey, type NodeRef, NodeType } from '@neat-js/core'
import { Activation } from '@neat-js/core'
import type { Phenotype } from '@neat-js/phenotype'
import {
  PhenotypeActionType,
  type PhenotypeAction,
} from '@neat-js/phenotype'
import type { PhenotypeFactory } from '@neat-js/phenotype'

import type { DefaultNEATGenome } from './DefaultNEATGenome.js'

export const createPhenotype: PhenotypeFactory<DefaultNEATGenome> = (
  genome: DefaultNEATGenome
): Phenotype => {
  // Sort genomes network topologically
  const order = genome.connections.sortTopologically()

  // Create array of all input node indexes, for insertion of neural network inputs
  const numInputNodes =
    Math.max(...Array.from(genome.inputs.values()).map((n) => n.id)) + 1
  const inputs = Array.from({ length: numInputNodes }, (_, i) => i)

  // Prepend input nodes to extraction of hidden nodes from topological sorting
  let nodes: NodeRef[] = [
    ...inputs.map((id) => ({ type: NodeType.Input, id })),
    ...order
      .filter((action) => action[0].type === NodeType.Hidden)
      .map((action) => action[0]),
  ]

  // Create array of all output node indexes, for extraction of neural network execution result
  const numOutputNodes =
    Math.max(...Array.from(genome.outputs.values()).map((n) => n.id)) + 1
  const outputs = Array.from(
    { length: numOutputNodes },
    (_, i) => i + nodes.length
  )

  // Append all output nodes
  nodes = nodes.concat(
    Array.from({ length: numOutputNodes }, (_, i) => ({
      type: NodeType.Output,
      id: i,
    }))
  )

  // Create mapping from NodeRef to array index in Network's node array
  const nodeMapping = new Map(
    nodes.map((nodeRef, index) => [nodeRefToKey(nodeRef), index])
  )

  // Map topologically sorted order to neural network actions
  const actions: PhenotypeAction[] = order.map((action) => {
    if (isOrderedActionEdge(action)) {
      const [from, to] = action
      const link = genome.links.get(nodeRefsToLinkKey(from, to))
      if (link == null) {
        throw new Error(
          `Link from ${nodeRefToKey(from)} to ${nodeRefToKey(
            to
          )} not found in genome`
        )
      }
      return {
        type: PhenotypeActionType.Link,
        from: nodeMapping.get(nodeRefToKey(from)) as number,
        to: nodeMapping.get(nodeRefToKey(to)) as number,
        weight: link.weight,
      }
    } else {
      const [node] = action
      return {
        type: PhenotypeActionType.Activation,
        node: nodeMapping.get(nodeRefToKey(node)) as number,
        bias: 0,
        activation:
          node.type === NodeType.Output
            ? genome.options.outputActivation
            : Activation.Sigmoid,
      }
    }
  })

  return {
    length: nodes.length,
    inputs,
    outputs,
    actions,
  }
}
