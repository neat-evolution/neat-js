import {
  NodeType,
  type Phenotype,
  type PhenotypeFactory,
  type NodeKey,
  toNodeKey,
  Connections,
  isActionEdge,
  type Connection,
  nodeKeyToRef,
  PhenotypeActionType,
  type PhenotypeAction,
  toLinkKey,
} from '@neat-evolution/core'
import {
  type CPPNGenome,
  createPhenotype as createCPPNPhenotype,
  type CPPNGenomeOptions,
} from '@neat-evolution/cppn'
import {
  exploreSubstrate,
  type ESHyperNEATGenomeOptions,
} from '@neat-evolution/es-hyperneat'
import { createExecutor } from '@neat-evolution/executor'
import {
  toPointKey,
  type Point,
  type PointKey,
} from '@neat-evolution/hyperneat'

import type { DESHyperNEATGenome } from './DESHyperNEATGenome.js'
import type { DESHyperNEATLink } from './DESHyperNEATLink.js'
import { parseNodes } from './developer/parseNodes.js'

/** type NodePoint = [type: NodeType, id: number, x: number, y: number] */
type NodePointKey = string

const toNodePointKey = (
  type: NodeType,
  id: number,
  x: number,
  y: number
): NodePointKey => {
  return `${type}[${id}]:${x},${y}`
}
const keysToNodePointKey = (
  nodeKey: NodeKey,
  pointKey: PointKey
): NodePointKey => {
  return `${nodeKey}:${pointKey}`
}

export const createPhenotype: PhenotypeFactory<DESHyperNEATGenome> = (
  genome
): Phenotype => {
  const initConfig = genome.genomeOptions.initConfig
  if (initConfig == null) {
    throw new Error('initConfig is required')
  }

  // from
  const r = genome.genomeOptions.resolution
  const inputNodes = parseNodes(
    genome.genomeOptions.inputConfig,
    r,
    initConfig.inputs
  )
  const outputNodes = parseNodes(
    genome.genomeOptions.outputConfig,
    r,
    initConfig.outputs
  )

  const flattenedInputs = new Set<NodePointKey>()
  for (let i = 0; i < inputNodes.length; i++) {
    for (const node of inputNodes[i] as Point[]) {
      const nodePointKey = toNodePointKey(NodeType.Input, i, node[0], node[1])
      flattenedInputs.add(nodePointKey)
    }
  }

  const flattenedOutputs = new Set<NodePointKey>()
  const outputNodesHash: Array<Set<PointKey>> = []
  for (let i = 0; i < outputNodes.length; i++) {
    const pointKeys = new Set<PointKey>()
    for (const node of outputNodes[i] as Point[]) {
      const pointKey = toPointKey(node)
      const nodePointKey = keysToNodePointKey(
        toNodeKey(NodeType.Output, i),
        pointKey
      )
      flattenedOutputs.add(nodePointKey)
      pointKeys.add(pointKey)
    }
    outputNodesHash.push(pointKeys)
  }

  // Let the genome prepare to provide cppns and depth
  // deprecated genome.initDESGenome()

  // Init assembled network
  const assembledConnections = new Connections<NodePointKey, number>()

  // Init known nodes with the input and output nodes
  const substrateNodes = new Map<NodeKey, Map<PointKey, Point>>()
  for (const [i, nodes] of inputNodes.entries()) {
    const points = new Map<PointKey, Point>()
    for (const node of nodes) {
      points.set(toPointKey(node), node)
    }
    substrateNodes.set(toNodeKey(NodeType.Input, i), points)
  }
  for (const [i, nodes] of outputNodes.entries()) {
    const points = new Map<PointKey, Point>()
    for (const node of nodes) {
      points.set(toPointKey(node), node)
    }
    substrateNodes.set(toNodeKey(NodeType.Output, i), points)
  }
  // All hidden substrates are empty
  for (const nodeKey of genome.hiddenNodes.keys()) {
    substrateNodes.set(nodeKey, new Map())
  }

  // Iterative network completion in topologically sorted order
  const order = genome.connections.sortTopologically()
  for (const action of order) {
    if (isActionEdge(action)) {
      const [sourceKey, targetKey] = action
      // const sourceRef = nodeKeyToRef(sourceKey)
      const targetRef = nodeKeyToRef(targetKey)

      // Develop the link's cppn
      const cppn = createExecutor(
        createCPPNPhenotype(
          genome.getLinkCPPN(
            sourceKey,
            targetKey
          ) as CPPNGenome<CPPNGenomeOptions>
        )
      )

      // Search for connections
      let layers: Point[][]
      let connections: Array<Connection<PointKey, number>>
      if (targetRef.type === NodeType.Hidden) {
        const points = substrateNodes.get(sourceKey) as Map<PointKey, Point>
        ;[layers, connections] = exploreSubstrate(
          Array.from(points.values()),
          [],
          cppn,
          1,
          false,
          true,
          genome.genomeOptions as ESHyperNEATGenomeOptions
        )
      } else if (targetRef.type === NodeType.Output) {
        const [layersReverse, connectionsReverse] = exploreSubstrate(
          outputNodes[targetRef.id] as Point[],
          [],
          cppn,
          1,
          true,
          true,
          genome.genomeOptions as ESHyperNEATGenomeOptions
        )
        if ((genome.getDepth(targetKey) as number) > 0) {
          // When depth of output substrate is > 0, search for additional non-reverse connections.
          // These can potentially be connected to the output when the output substrate is developed.
          const points = substrateNodes.get(sourceKey) as Map<PointKey, Point>
          const [layersForward, connectionsForward] = exploreSubstrate(
            Array.from(points.values()),
            [],
            cppn,
            1,
            false,
            true,
            genome.genomeOptions as ESHyperNEATGenomeOptions
          )

          // If there are any connections to output nodes, these will also be
          // present in the reverse search. Remove to avoid duplicates.
          const filteredLayer1: Point[] = []
          const outputSet = outputNodesHash[targetRef.id] as Set<PointKey>
          if (layersForward.length > 1) {
            for (const node of layersForward[1] as Point[]) {
              if (!outputSet.has(toPointKey(node))) {
                filteredLayer1.push(node)
              }
            }
          }

          const filteredConnections: Array<Connection<PointKey, number>> = []
          for (const connection of connectionsForward) {
            if (!outputSet.has(connection[1])) {
              filteredConnections.push(connection)
            }
          }
          connections = filteredConnections

          // Merge the normal and reverse search.
          const mergedLayers1: Point[] = []
          for (const node of filteredLayer1) {
            mergedLayers1.push(node)
          }
          for (const node of layersReverse[1] as Point[]) {
            mergedLayers1.push(node)
          }
          layers = [[], mergedLayers1]
          for (const connection of connectionsReverse) {
            connections.push(connection)
          }
        } else {
          layers = layersReverse
          connections = connectionsReverse
        }
      } else {
        throw new Error('target is input substrate or unknown node type')
      }

      // Add discovered nodes to target substrate
      const nodes = substrateNodes.get(targetKey) as Map<PointKey, Point>

      // First layer contains source nodes
      // Never more than a single layer of new nodes since depth = 1
      if (layers[1] != null) {
        for (const node of layers[1]) {
          nodes.set(toPointKey(node), node)
        }
      }

      // Add discovered connections to assembled network
      for (const connection of connections) {
        const [from, to, edge] = connection
        const linkKey = toLinkKey(sourceKey, targetKey)
        const weight = (genome.links.get(linkKey) as DESHyperNEATLink).weight
        assembledConnections.add(
          keysToNodePointKey(sourceKey, from),
          keysToNodePointKey(targetKey, to),
          edge * weight
        )
      }
    } else {
      const [nodeKey] = action
      const nodeRef = nodeKeyToRef(nodeKey)

      const depth = genome.getDepth(nodeKey) as number
      if (depth > 0) {
        // Develop the node's cppn
        const cppn = createExecutor(
          createCPPNPhenotype(
            genome.getNodeCPPN(nodeKey) as CPPNGenome<CPPNGenomeOptions>
          )
        )

        // Develop substrate
        let layers: Point[][]
        let connections: Array<Connection<NodePointKey, number>>
        if (
          nodeRef.type === NodeType.Input ||
          nodeRef.type === NodeType.Hidden
        ) {
          const points = substrateNodes.get(nodeKey) as Map<PointKey, Point>
          ;[layers, connections] = exploreSubstrate(
            Array.from(points.values()),
            [],
            cppn,
            depth,
            false,
            false,
            genome.genomeOptions as ESHyperNEATGenomeOptions
          )
        } else if (nodeRef.type === NodeType.Output) {
          // Output substrates are searched in reverse, starting at the output nodes
          ;[layers, connections] = exploreSubstrate(
            outputNodes[nodeRef.id] as Point[],
            [],
            cppn,
            depth,
            true,
            false,
            genome.genomeOptions as ESHyperNEATGenomeOptions
          )
        } else {
          throw new Error('Unknown node type')
        }

        // Add discovered nodes to target substrate
        const nodes = substrateNodes.get(nodeKey) as Map<PointKey, Point>
        // First layer contains source nodes
        for (let i = 1; i < layers.length; i++) {
          const layer = layers[i] as Point[]
          for (const node of layer) {
            nodes.set(toPointKey(node), node)
          }
        }
        // Add discovered connections to assembled network
        for (const connection of connections) {
          const [from, to, edge] = connection
          assembledConnections.add(
            keysToNodePointKey(nodeKey, from),
            keysToNodePointKey(nodeKey, to),
            edge
          )
        }
      }
    }
  }

  // Remove any node not on a path between input and output nodes
  const pruned = assembledConnections.prune(
    flattenedInputs,
    flattenedOutputs,
    true
  )

  // Collect all hidden nodes, in all hidden substrates and I/O substrates
  const hiddenNodes: NodePointKey[] = []
  for (const [nodeKey, node] of genome.hiddenNodes.entries()) {
    const points = substrateNodes.get(nodeKey) as Map<PointKey, Point>
    for (const point of points.values()) {
      hiddenNodes.push(toNodePointKey(node.type, node.id, point[0], point[1]))
    }
  }
  for (const [nodeKey, node] of genome.inputs.entries()) {
    const points = substrateNodes.get(nodeKey) as Map<PointKey, Point>
    for (const point of points.values()) {
      const nodePointKey = toNodePointKey(
        node.type,
        node.id,
        point[0],
        point[1]
      )
      if (!flattenedInputs.has(nodePointKey)) {
        hiddenNodes.push(nodePointKey)
      }
    }
  }
  for (const [nodeKey, node] of genome.outputs.entries()) {
    const points = substrateNodes.get(nodeKey) as Map<PointKey, Point>
    for (const point of points.values()) {
      const nodePointKey = toNodePointKey(
        node.type,
        node.id,
        point[0],
        point[1]
      )
      if (!flattenedOutputs.has(nodePointKey)) {
        hiddenNodes.push(nodePointKey)
      }
    }
  }

  const flattenedHiddenNodes: NodePointKey[] = []
  for (const node of hiddenNodes) {
    if (!pruned.has(node)) {
      flattenedHiddenNodes.push(node)
    }
  }

  // Collect all nodes (in all substrates)
  const nodes = [
    ...flattenedInputs,
    ...flattenedHiddenNodes,
    ...flattenedOutputs,
  ]

  const firstOutputId = nodes.length - flattenedInputs.size + 1
  const inputs = Array.from({ length: flattenedInputs.size }, (_, i) => i)
  const outputs = Array.from(
    { length: flattenedOutputs.size },
    (_, i) => i + firstOutputId
  )

  // Create mapping from nodes to array index in Network's node vector
  const nodeMapping = new Map<NodePointKey, number>()
  for (let i = 0; i < nodes.length; i++) {
    nodeMapping.set(nodes[i] as NodePointKey, i)
  }

  // Map topologically sorted order to neural network actions.
  const actions: PhenotypeAction[] = []
  for (const action of assembledConnections.sortTopologically()) {
    if (isActionEdge(action)) {
      const [from, to, weight] = action
      actions.push([
        PhenotypeActionType.Link,
        nodeMapping.get(from) as number,
        nodeMapping.get(to) as number,
        weight,
      ])
    } else {
      const [nodeKey] = action
      const index = nodeMapping.get(nodeKey) as number
      actions.push([
        PhenotypeActionType.Activation,
        index,
        0.0,
        index < firstOutputId
          ? genome.genomeOptions.hiddenActivation
          : genome.genomeOptions.outputActivation,
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
