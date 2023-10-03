import fs from 'node:fs/promises'

import {
  NodeType,
  nodeRefsToLinkKey,
  nodeRefToKey,
  type GenomeDataLinkEntry,
  type GenomeDataLink,
  type NodeRef,
  type GenomeDataNodeEntry,
  type Action,
  type Connection,
  type Activation,
  PhenotypeActionType,
  type Phenotype,
  type PhenotypeLinkAction,
  type PhenotypeActivationAction,
} from '@neat-js/core'
import type {
  DefaultNEATGenome,
  DefaultNEATGenomeFactoryOptions,
} from '@neat-js/neat'

const knownNodes = new Set<string>()
const linksMap = new Map<string, GenomeDataLink<DefaultNEATGenome>>()
const hiddenNodes: Array<GenomeDataNodeEntry<DefaultNEATGenome>> = []
const links: Array<GenomeDataLinkEntry<DefaultNEATGenome>> = []

export let genomeFitness: number | null = null
export const genomeConnections: Array<Connection<NodeRef, number>> = []
export const genomeActions: Action[] = []
export const genomeFactoryOptions: DefaultNEATGenomeFactoryOptions = {
  hiddenNodes,
  links,
  isSafe: true,
}
export const genomePhenotype: Phenotype = {
  length: 0,
  inputs: [],
  outputs: [],
  actions: [],
}

function actionStringToNodeRef(
  input: string
): { type: NodeType; id: number; config: null; state: null } | null {
  const regex = /Node\(node:\s*([A-Za-z]+)(\d+)\)/
  const match = input.match(regex)

  if (match) {
    const [, type, id] = match
    if (type == null || id == null) {
      return null
    }
    return {
      config: null,
      state: null,
      type:
        type === 'I'
          ? NodeType.Input
          : type === 'H'
          ? NodeType.Hidden
          : NodeType.Output,
      id: parseInt(id, 10),
    }
  }

  return null
}

function actionStringToLinkRef(
  input: string
): [from: NodeRef, to: NodeRef, weight: number] | null {
  const regex =
    /Edge\(from:\s*([A-Za-z]+\d+),\s*to:\s*([A-Za-z]+\d+),\s*edge:\s*\(\)\)/
  const match = input.match(regex)

  if (match) {
    const [, fromString, toString] = match
    if (fromString == null || toString == null) {
      return null
    }
    const fromRef = actionStringToNodeRef(`Node(node: ${fromString})`)
    const toRef = actionStringToNodeRef(`Node(node: ${toString})`)
    if (fromRef == null || toRef == null) {
      return null
    }
    const linkKey = nodeRefsToLinkKey(fromRef, toRef)
    const link = linksMap.get(linkKey)
    return [fromRef, toRef, link?.[2] ?? 0]
  }

  return null
}

const data = await fs.readFile(
  new URL('debug_output.txt', import.meta.url).pathname,
  'utf-8'
)
const lines = data.split('\n')

let mode = null
for (const line of lines) {
  if (line.startsWith('fitness: ')) {
    genomeFitness = parseFloat(line.slice(9))
  }
  if (line === 'links: [' && mode == null) {
    mode = 'links'
    continue
  }
  if (line === 'connections: [' && mode == null) {
    mode = 'connections'
    continue
  }
  if (line === 'order: [' && mode == null) {
    mode = 'order'
    continue
  }
  if (line.startsWith('length: ') && mode == null) {
    genomePhenotype.length = parseInt(line.slice(8), 10)
    continue
  }
  if (line.startsWith('inputs: ') && mode == null) {
    genomePhenotype.inputs = JSON.parse(line.slice(8))
    continue
  }
  if (line.startsWith('outputs: ') && mode == null) {
    genomePhenotype.outputs = JSON.parse(line.slice(9))
    continue
  }
  if (line === 'actions: [' && mode == null) {
    mode = 'actions'
    continue
  }

  // Mode Links
  if (mode === 'links') {
    if (line === ']') {
      mode = null
      continue
    }
    const regex =
      /from: (\w+), to: (\w+), weight: ([\d.-]+), innovation: (\d+),?/
    const match = line.match(regex)

    if (match) {
      const [, from, to, weight, innovation] = match
      if (from == null || to == null || weight == null || innovation == null) {
        throw new Error('Invalid link.')
      }
      const fromNode = from.startsWith('H')
        ? { type: NodeType.Hidden, id: Number(from.slice(1)) }
        : from.startsWith('I')
        ? { type: NodeType.Input, id: Number(from.slice(1)) }
        : { type: NodeType.Output, id: Number(from.slice(1)) }
      const toNode = to.startsWith('H')
        ? { type: NodeType.Hidden, id: Number(to.slice(1)) }
        : to.startsWith('I')
        ? { type: NodeType.Input, id: Number(to.slice(1)) }
        : { type: NodeType.Output, id: Number(to.slice(1)) }

      if (fromNode.type === NodeType.Hidden && !knownNodes.has(from)) {
        knownNodes.add(from)
        const type = NodeType.Hidden
        const id = Number(from.slice(1))
        hiddenNodes.push([nodeRefToKey(fromNode), { type, id }])
      }
      if (to.startsWith('H') && !knownNodes.has(to)) {
        knownNodes.add(to)
        const type = NodeType.Hidden
        const id = Number(to.slice(1))
        hiddenNodes.push([nodeRefToKey(toNode), { type, id }])
      }
      const linkKey = nodeRefsToLinkKey(fromNode, toNode)
      const genomeDataLink: GenomeDataLink<DefaultNEATGenome> = [
        nodeRefToKey(fromNode),
        nodeRefToKey(toNode),
        parseFloat(weight),
        parseInt(innovation, 10),
      ]
      links.push([linkKey, genomeDataLink])
      linksMap.set(linkKey, genomeDataLink)
    }
  }

  // Mode Connections
  if (mode === 'connections') {
    if (line === ']') {
      mode = null
      continue
    }
    const regex =
      /from:\s*([A-Za-z]+\d+),\s*to:\s*([A-Za-z]+\d+),\s*edge:\s*\(\),?/
    const match = line.match(regex)

    if (match) {
      const [, fromString, toString] = match
      if (fromString == null || toString == null) {
        throw new Error('Invalid connection.')
      }
      const fromRef = actionStringToNodeRef(`Node(node: ${fromString})`)
      const toRef = actionStringToNodeRef(`Node(node: ${toString})`)
      if (fromRef == null || toRef == null) {
        throw new Error('Invalid connection.')
      }
      const linkKey = nodeRefsToLinkKey(fromRef, toRef)
      const link = linksMap.get(linkKey)
      genomeConnections.push([fromRef, toRef, link?.[2] ?? 0])
    }
  }

  // Mode Order
  if (mode === 'order') {
    if (line === ']') {
      mode = null
      continue
    }
    if (line.startsWith('N')) {
      const value = actionStringToNodeRef(line)
      if (value == null) {
        throw new Error('Invalid node.')
      }
      genomeActions.push([value])
    } else if (line.startsWith('E')) {
      const value = actionStringToLinkRef(line)
      if (value == null) {
        throw new Error('Invalid link.')
      }
      genomeActions.push(value)
    }
  }

  // Mode Actions
  if (mode === 'actions') {
    if (line === ']') {
      mode = null
      continue
    }
    if (line.startsWith('A')) {
      const regex = /Activation\((\d+), ([\d.-]+), ([\w]+)\),?/
      const match = line.match(regex)

      if (match) {
        const [, node, bias, activation] = match
        if (node == null || bias == null || activation == null) {
          throw new Error('Invalid action.')
        }
        const action: PhenotypeActivationAction = {
          type: PhenotypeActionType.Activation,
          node: parseInt(node, 10),
          bias: parseFloat(bias),
          activation: activation as Activation,
        }
        genomePhenotype.actions.push(action)
      }
    } else if (line.startsWith('L')) {
      const regex = /Link\((\d+), (\d+), ([\d.-]+)\),?/
      const match = line.match(regex)

      if (match) {
        const [, from, to, weight] = match
        if (from == null || to == null || weight == null) {
          throw new Error('Invalid action.')
        }
        const action: PhenotypeLinkAction = {
          type: PhenotypeActionType.Link,
          from: parseInt(from, 10),
          to: parseInt(to, 10),
          weight: parseFloat(weight),
        }
        genomePhenotype.actions.push(action)
      }
    }
  }
}
