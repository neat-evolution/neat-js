import {
  NodeType,
  type NodeRef,
  type Phenotype,
  type PhenotypeFactory,
  type NodeKey,
  toNodeKey,
  Connections,
  isActionEdge,
  type Connection,
  nodeKeyToType,
  nodeKeyToRefTuple,
  nodeKeyToRef,
  PhenotypeActionType,
  type PhenotypeAction,
  toLinkKey,
} from '@neat-js/core'
import {
  type CPPNGenome,
  createPhenotype as createCPPNPhenotype,
  type CPPNGenomeOptions,
} from '@neat-js/cppn'
import {
  exploreSubstrate,
  type ESHyperNEATGenomeOptions,
} from '@neat-js/es-hyperneat'
import { createSyncExecutor } from '@neat-js/executor'
import {
  toPointKey,
  type Point,
  type PointKey,
  fromPointKey,
} from '@neat-js/hyperneat'

import type { DESHyperNEATGenome } from './DESHyperNEATGenome.js'
import type { DESHyperNEATLink } from './DESHyperNEATLink.js'
import { parseNodes } from './developer/parseNodes.js'

type NodePoint = [node: NodeRef, x: number, y: number]
type NodePointKey = string

const toNodePointKey = (node: NodeRef, x: number, y: number): NodePointKey => {
  return `${node.type}[${node.id}]:${x},${y}`
}

const nodePointToKey = ([node, x, y]: NodePoint): NodePointKey => {
  return toNodePointKey(node, x, y)
}

// const fromNodePointKey = (key: NodePointKey): NodePoint => {
//   const [nodeType, id, x, y] = key.split(/[[\]:,]/) as [
//     string,
//     string,
//     string,
//     string
//   ]
//   return [
//     { type: nodeType as NodeType, id: parseInt(id, 10) },
//     parseFloat(x),
//     parseFloat(y),
//   ]
// }

export const createPhenotype: PhenotypeFactory<DESHyperNEATGenome> = (
  genome
): Phenotype => {
  const r = genome.genomeOptions.resolution
  const initConfig = genome.genomeOptions.initConfig
  if (initConfig == null) {
    throw new Error('initConfig is required')
  }

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

  const flattenedInputs: NodePointKey[] = []
  const flattenedInputsHash = new Map<NodePointKey, NodePoint>()
  for (let i = 0; i < inputNodes.length; i++) {
    for (const node of inputNodes[i] as Point[]) {
      const nodePoint: NodePoint = [
        { type: NodeType.Input, id: i },
        node[0],
        node[1],
      ]
      const nodePointKey = nodePointToKey(nodePoint)
      flattenedInputs.push(nodePointKey)
      flattenedInputsHash.set(nodePointKey, nodePoint)
    }
  }

  const flattenedOutputs: NodePointKey[] = []
  const flattenedOutputsHash = new Map<NodePointKey, NodePoint>()
  for (let i = 0; i < outputNodes.length; i++) {
    for (const node of outputNodes[i] as Point[]) {
      const nodePoint: NodePoint = [
        { type: NodeType.Output, id: i },
        node[0],
        node[1],
      ]
      const nodePointKey = nodePointToKey(nodePoint)
      flattenedOutputs.push(nodePointKey)
      flattenedInputsHash.set(nodePointKey, nodePoint)
    }
  }

  const outputNodesHash: Array<Set<PointKey>> = []
  for (const nodes of outputNodes) {
    const pointKeys = new Set<PointKey>()
    for (const node of nodes) {
      pointKeys.add(toPointKey(node))
    }
    outputNodesHash.push(pointKeys)
  }

  // Not used
  genome.initDESGenome()

  const assembledConnections = new Connections<NodePointKey, number>()

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
  for (const nodeKey of genome.hiddenNodes.keys()) {
    substrateNodes.set(nodeKey, new Map())
  }

  const order = genome.connections.sortTopologically()
  for (const action of order) {
    if (isActionEdge(action)) {
      const [from, to] = action
      const cppn = createSyncExecutor(
        createCPPNPhenotype(
          genome.getLinkCPPN(from, to) as CPPNGenome<CPPNGenomeOptions>
        )
      )

      let layers: Point[][]
      let connections: Array<Connection<PointKey, number>>
      const sourceRef = nodeKeyToRef(from)
      const targetRef = nodeKeyToRef(to)
      if (targetRef.type === NodeType.Input) {
        throw new Error('Input substrate cannot be a target connection')
      } else if (targetRef.type === NodeType.Hidden) {
        const points = substrateNodes.get(from) as Map<PointKey, Point>
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
        if ((genome.getDepth(targetRef) as number) > 0) {
          const points = substrateNodes.get(from) as Map<PointKey, Point>
          ;[layers, connections] = exploreSubstrate(
            Array.from(points.values()),
            [],
            cppn,
            1,
            false,
            true,
            genome.genomeOptions as ESHyperNEATGenomeOptions
          )
          layers[1] = (layers[1] as Point[]).filter(
            (node) =>
              !(outputNodesHash[targetRef.id] as Set<PointKey>).has(
                toPointKey(node)
              )
          )
          connections = connections.filter(
            (connection) =>
              !(outputNodesHash[targetRef.id] as Set<PointKey>).has(
                connection[1]
              )
          )
          layers = [[], [...layers[1], ...(layersReverse[1] as Point[])]]
          connections.push(...connectionsReverse)
        } else {
          layers = layersReverse
          connections = connectionsReverse
        }

        const nodes = substrateNodes.get(to) as Map<PointKey, Point>
        for (const node of layers[1] as Point[]) {
          nodes.set(toPointKey(node), node)
        }
        for (const connection of connections) {
          const [from, to, edge] = connection
          const [x1, y1] = fromPointKey(from)
          const [x2, y2] = fromPointKey(to)
          const linkKey = toLinkKey(from, to)
          const weight = (genome.links.get(linkKey) as DESHyperNEATLink).weight
          assembledConnections.add(
            toNodePointKey(sourceRef, x1, y1),
            toNodePointKey(targetRef, x2, y2),
            edge * weight
          )
        }
      }
    } else {
      const [nodeKey] = action
      const nodeRef = nodeKeyToRef(nodeKey)
      const depth = genome.getDepth(nodeRef) as number
      if (depth > 0) {
        const cppn = createSyncExecutor(
          createCPPNPhenotype(
            genome.getNodeCPPN(nodeRef) as CPPNGenome<CPPNGenomeOptions>
          )
        )

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

        const nodes = substrateNodes.get(nodeKey) as Map<PointKey, Point>
        for (const layer of layers.slice(1)) {
          for (const node of layer) {
            nodes.set(toPointKey(node), node)
          }
        }
        for (const connection of connections) {
          const [from, to, edge] = connection
          const [x1, y1] = fromPointKey(from)
          const [x2, y2] = fromPointKey(to)
          assembledConnections.add(
            toNodePointKey(nodeRef, x1, y1),
            toNodePointKey(nodeRef, x2, y2),
            edge
          )
        }
      }
    }
  }

  const pruned = new Set(
    assembledConnections.prune(flattenedInputs, flattenedOutputs, true)
  )

  const hiddenNodes: NodePointKey[] = []
  for (const nodeKey of genome.hiddenNodes.keys()) {
    const nodeRef = nodeKeyToRef(nodeKey)
    const points = substrateNodes.get(nodeKey) as Map<PointKey, Point>
    for (const point of points.values()) {
      const [x, y] = point
      hiddenNodes.push(toNodePointKey(nodeRef, x, y))
    }
  }
  for (const nodeKey of genome.inputs.keys()) {
    const nodeRef = nodeKeyToRef(nodeKey)
    const points = substrateNodes.get(nodeKey) as Map<PointKey, Point>
    for (const point of points.values()) {
      if (!flattenedInputsHash.has(nodeKey)) {
        const [x, y] = point
        hiddenNodes.push(toNodePointKey(nodeRef, x, y))
      }
    }
  }
  for (const nodeKey of genome.outputs.keys()) {
    const nodeRef = nodeKeyToRef(nodeKey)
    const points = substrateNodes.get(nodeKey) as Map<PointKey, Point>
    for (const point of points.values()) {
      if (!flattenedOutputsHash.has(nodeKey)) {
        const [x, y] = point
        hiddenNodes.push(toNodePointKey(nodeRef, x, y))
      }
    }
  }

  const validHiddenNodes: NodePointKey[] = []
  for (const node of hiddenNodes) {
    if (!pruned.has(node)) {
      validHiddenNodes.push(node)
    }
  }

  const nodes = [...flattenedInputs, ...validHiddenNodes, ...flattenedOutputs]

  const firstOutputId = nodes.length - flattenedOutputs.length
  const inputs = Array.from({ length: flattenedInputs.length }, (_, i) => i)
  const outputs = Array.from(
    { length: flattenedOutputs.length },
    (_, i) => i + firstOutputId
  )

  const nodeMapping = new Map<NodePointKey, number>(
    nodes.map((node, i) => [node, i])
  )

  const actions: PhenotypeAction[] = []
  for (const action of assembledConnections.sortTopologically()) {
    if (isActionEdge(action)) {
      const [from, to, weight] = action
      actions.push({
        type: PhenotypeActionType.Link,
        from: nodeMapping.get(from) as number,
        to: nodeMapping.get(to) as number,
        weight,
      })
    } else {
      const [nodeKey] = action
      const index = nodeMapping.get(nodeKey) as number
      actions.push({
        type: PhenotypeActionType.Activation,
        node: index,
        bias: 0.0,
        activation:
          index < firstOutputId
            ? genome.genomeOptions.hiddenActivation
            : genome.genomeOptions.outputActivation,
      })
    }
  }

  const hiddenSubstrateNodes = Array.from(assembledConnections.nodes())
    .filter((node) => nodeKeyToType(node) === NodeType.Hidden)
    .map((node) => nodeKeyToRefTuple(node)[1])
  const hiddenSubstrateNodeCounts = new Map<number, number>()
  for (const nodeId of hiddenSubstrateNodes) {
    hiddenSubstrateNodeCounts.set(
      nodeId,
      (hiddenSubstrateNodeCounts.get(nodeId) ?? 0) + 1
    )
  }

  return {
    length: nodes.length,
    inputs,
    outputs,
    actions,
  }
}
