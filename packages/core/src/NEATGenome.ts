import type { Config } from './config/Config.js'
import { Connections } from './genome/Connections.js'
import type { Genome } from './genome/Genome.js'
import {
  type GenomeDataNodeEntry,
  type GenomeDataLinkEntry,
} from './genome/GenomeData.js'
import type { GenomeFactory } from './genome/GenomeFactory.js'
import type { GenomeOptions } from './genome/GenomeOptions.js'
import type { Link } from './link/Link.js'
import type { LinkFactory } from './link/LinkFactory.js'
import { linkRefToKey, nodeRefsToLinkKey } from './link/linkRefToKey.js'
import type { NEATGenomeData } from './NEATGenomeData.js'
import type { NEATGenomeFactoryOptions } from './NEATGenomeFactoryOptions.js'
import type { Node } from './node/Node.js'
import { NodeType, type NodeRef } from './node/NodeData.js'
import type { NodeFactory } from './node/NodeFactory.js'
import { nodeRefToKey, type NodeKey } from './node/nodeRefToKey.js'
import type { State } from './state/State.js'
import { shuffle } from './utils/shuffle.js'

// FIXME: rename to CoreGenome
export class NEATGenome<
  N extends Node<any, any, N>,
  L extends Link<any, any, L>,
  C extends Config<N['config'], L['config']>,
  S extends State<N['state'], L['state'], S>,
  GO extends GenomeOptions,
  GFO extends NEATGenomeFactoryOptions<N, L, C, S, GO, GFO, GD, G>,
  GD extends NEATGenomeData<N, L, C, S, GO, GFO, GD, G>,
  G extends NEATGenome<N, L, C, S, GO, GFO, GD, G>
> implements Genome<N, L, C, S, GO, GFO, GD, G>
{
  public readonly config: C
  public readonly state: S
  public readonly genomeOptions: GO

  public readonly inputs: Map<string, N>
  public readonly hiddenNodes: Map<string, N>
  public readonly outputs: Map<string, N>
  public readonly links: Map<string, L>
  public readonly connections: Connections

  private readonly createNode: NodeFactory<N['config'], N['state'], N>
  private readonly createLink: LinkFactory<L['config'], L['state'], L>
  private readonly createGenome: GenomeFactory<C, S, GO, GFO, GD, G>

  constructor(
    config: C,
    state: S,
    genomeOptions: GO,
    createNode: NodeFactory<N['config'], N['state'], N>,
    createLink: LinkFactory<L['config'], L['state'], L>,
    createGenome: GenomeFactory<C, S, GO, GFO, GD, G>,
    factoryOptions?: GFO
  ) {
    this.config = config
    this.genomeOptions = genomeOptions
    this.state = state
    this.createNode = createNode
    this.createLink = createLink
    this.createGenome = createGenome

    this.inputs = new Map<string, N>()
    this.hiddenNodes = new Map<string, N>()
    this.outputs = new Map<string, N>()
    this.links = new Map<string, L>()
    this.connections = new Connections()

    for (let i = 0; i < genomeOptions.inputs; i++) {
      const node = this.createNode(
        NodeType.Input,
        i,
        this.config.node(),
        this.state.node()
      )
      this.inputs.set(nodeRefToKey(node), node)
    }

    for (let i = 0; i < genomeOptions.outputs; i++) {
      const node = this.createNode(
        NodeType.Output,
        i,
        this.config.node(),
        this.state.node()
      )
      this.outputs.set(nodeRefToKey(node), node)
    }

    if (factoryOptions != null) {
      for (const [, { id, type }] of factoryOptions.hiddenNodes) {
        const node = this.createNode(
          type,
          id,
          this.config.node(),
          this.state.node()
        )
        this.hiddenNodes.set(nodeRefToKey(node), node)
      }
      for (const [
        linkKey,
        [fromKey, toKey, weight, innovation],
      ] of factoryOptions.links) {
        const from = this.getNodeByKey(fromKey)
        const to = this.getNodeByKey(toKey)
        if (from == null || to == null) {
          throw new Error(
            `Unable to hydrate link ${linkKey}; missing node; from: ${fromKey} ${
              from != null
            }; to: ${toKey} ${to != null}`
          )
        }
        const link = this.createLink(
          from,
          to,
          weight,
          innovation,
          this.config.link(),
          this.state.link()
        )
        this.insertLink(link, factoryOptions.isSafe)
      }
    }
  }

  clone(): G {
    return this.createGenome(
      this.config,
      this.state,
      this.genomeOptions,
      this.toFactoryOptions()
    )
  }

  mutate(): void {
    const neatConfig = this.config.neat()

    if (Math.random() < neatConfig.addNodeProbability) {
      this.mutationAddNode()
    }

    if (Math.random() < neatConfig.addLinkProbability) {
      this.mutationAddLink()
    }

    if (Math.random() < neatConfig.removeLinkProbability) {
      this.mutationRemoveLink()
    }

    if (Math.random() < neatConfig.removeNodeProbability) {
      this.mutationRemoveNode()
    }

    if (Math.random() < neatConfig.mutateLinkWeightProbability) {
      this.mutateLinkWeight()
    }
  }

  distance(other: G): number {
    const neatConfig = this.config.neat()

    let linkDifferences: number = 0
    let linkDistance: number = 0
    let linkCount = this.links.size

    for (const linkRef of other.links.keys()) {
      if (!this.links.has(linkRef)) {
        linkDifferences++
      }
    }

    linkCount += linkDifferences

    for (const linkRef of this.links.keys()) {
      if (other.links.has(linkRef)) {
        linkDistance += (this.links.get(linkRef) as L).distance(
          other.links.get(linkRef) as L
        )
      } else {
        linkDifferences++
      }
    }

    const linkDist =
      linkCount === 0 ? 0 : (linkDifferences + linkDistance) / linkCount

    let nodeDifferences = 0
    let nodeDistance = 0
    let nodeCount = this.hiddenNodes.size

    if (!neatConfig.onlyHiddenNodeDistance) {
      nodeCount += this.inputs.size + this.outputs.size
    }

    for (const nodeRef of other.hiddenNodes.keys()) {
      if (!this.hiddenNodes.has(nodeRef)) {
        nodeDifferences++
      }
    }

    if (!neatConfig.onlyHiddenNodeDistance) {
      for (const nodeRef of other.inputs.keys()) {
        if (!this.inputs.has(nodeRef)) {
          nodeDifferences++
        }
      }
      for (const nodeRef of other.outputs.keys()) {
        if (!this.outputs.has(nodeRef)) {
          nodeDifferences++
        }
      }
    }

    for (const [nodeRef, node] of this.hiddenNodes.entries()) {
      if (other.hiddenNodes.has(nodeRef)) {
        nodeDistance += node.distance(other.hiddenNodes.get(nodeRef) as N)
      } else {
        nodeDifferences++
      }
    }

    if (!neatConfig.onlyHiddenNodeDistance) {
      for (const [nodeRef, node] of this.inputs.entries()) {
        if (other.inputs.has(nodeRef)) {
          nodeDistance += node.distance(other.inputs.get(nodeRef) as N)
        } else {
          nodeDifferences++
        }
      }
      for (const [nodeRef, node] of this.outputs.entries()) {
        if (other.outputs.has(nodeRef)) {
          nodeDistance += node.distance(other.outputs.get(nodeRef) as N)
        } else {
          nodeDifferences++
        }
      }
    }

    nodeCount += nodeDifferences

    const nodeDist =
      nodeCount === 0 ? 0 : (nodeDifferences + nodeDistance) / nodeCount

    return (
      neatConfig.linkDistanceWeight * linkDist +
      (1 - neatConfig.linkDistanceWeight) * nodeDist
    )
  }

  crossover(other: G, fitness: number, otherFitness: number): G {
    // Let parent1 be the fitter parent
    const [parent1, parent2] =
      fitness > otherFitness ? [this, other] : [other, this]

    const genome = this.createGenome(
      parent1.config,
      parent1.state,
      parent1.genomeOptions
    )

    // Copy links only in fitter parent, perform crossover if in both parents
    for (const [linkRef, link] of parent1.links.entries()) {
      if (parent2.links.has(linkRef)) {
        const link2 = parent2.links.get(linkRef) as L
        const newLink = link.crossover(link2, fitness, otherFitness)
        genome.insertLink(newLink, true)
      } else {
        genome.insertLink(link, false)
      }
    }

    // Copy nodes only in fitter parent, perform crossover if in both parents
    for (const [nodeRef, node] of parent1.inputs.entries()) {
      if (parent2.inputs.has(nodeRef)) {
        const node2 = parent2.inputs.get(nodeRef) as N
        genome.inputs.set(nodeRef, node.crossover(node2, fitness, otherFitness))
      } else {
        genome.inputs.set(nodeRef, node)
      }
    }

    for (const [nodeRef, node] of parent1.hiddenNodes.entries()) {
      if (parent2.hiddenNodes.has(nodeRef)) {
        const node2 = parent2.hiddenNodes.get(nodeRef) as N
        genome.hiddenNodes.set(
          nodeRef,
          node.crossover(node2, fitness, otherFitness)
        )
      } else {
        genome.hiddenNodes.set(nodeRef, node)
      }
    }

    for (const [nodeRef, node] of parent1.outputs.entries()) {
      if (parent2.outputs.has(nodeRef)) {
        const node2 = parent2.outputs.get(nodeRef) as N
        genome.outputs.set(
          nodeRef,
          node.crossover(node2, fitness, otherFitness)
        )
      } else {
        genome.outputs.set(nodeRef, node)
      }
    }

    return genome
  }

  getNode(nodeRef: NodeRef): N | undefined {
    switch (nodeRef.type) {
      case NodeType.Input:
        return this.inputs.get(nodeRefToKey(nodeRef))
      case NodeType.Hidden:
        return this.hiddenNodes.get(nodeRefToKey(nodeRef))
      case NodeType.Output:
        return this.outputs.get(nodeRefToKey(nodeRef))
      default:
        return undefined
    }
  }

  getNodeByKey(nodeKey: NodeKey): N | undefined {
    const type = nodeKey[0]
    switch (type) {
      case 'I':
        return this.inputs.get(nodeKey)
      case 'H':
        return this.hiddenNodes.get(nodeKey)
      case 'O':
        return this.outputs.get(nodeKey)
      default:
        return undefined
    }
  }

  splitLink(
    from: NodeRef,
    to: NodeRef,
    /** Innovation.nodeNumber */
    nodeNumber: number,
    /** Innovation.innovationNumber */
    innovationNumber: number
  ): void {
    // Retrieve the link to be split
    const linkKey = nodeRefsToLinkKey(from, to)
    const link = this.links.get(linkKey) as L
    if (link == null) {
      throw new Error('Unable to split nonexistent link')
    }

    // Remove old link and connection
    this.links.delete(linkKey)
    this.connections.delete(from, to)

    const newNodeKey = nodeRefToKey({ type: NodeType.Hidden, id: nodeNumber })
    const isSafe = !this.hiddenNodes.has(newNodeKey)
    const newNode =
      this.hiddenNodes.get(newNodeKey) ??
      this.createNode(
        NodeType.Hidden,
        nodeNumber,
        this.config.node(),
        this.state.node()
      )

    // Insert new hidden node
    this.hiddenNodes.set(newNodeKey, newNode)

    type LinkDetails = [from: NodeRef, to: NodeRef, innovationNumber: number]
    let link1Details: LinkDetails
    let link2Details: LinkDetails

    if (from.type === NodeType.Input) {
      link1Details = [newNode, to, innovationNumber + 1]
      link2Details = [from, newNode, innovationNumber]
    } else {
      link1Details = [from, newNode, innovationNumber]
      link2Details = [newNode, to, innovationNumber + 1]
    }

    // FIXME: why?
    const link1 = link.identity(
      this.createLink(
        link1Details[0],
        link1Details[1],
        1.0,
        link1Details[2],
        this.config.node(),
        this.state.node()
      )
    )

    const link2 = link.cloneWith(
      this.createLink(
        link2Details[0],
        link2Details[1],
        link.neat().weight,
        link2Details[2],
        this.config.node(),
        this.state.node()
      )
    )
    this.insertLink(link1, isSafe)
    this.insertLink(link2, isSafe)
  }

  insertLink(link: L, isSafe?: boolean): void {
    const knownNotToCreateCycle =
      isSafe === true || !this.connections.createsCycle(link.from, link.to)

    if (knownNotToCreateCycle) {
      this.links.set(linkRefToKey(link), link)
      this.connections.add(link.from, link.to, link.weight, true)
    }
  }

  mutateLinkWeight(): void {
    const neatConfig = this.config.neat()

    if (neatConfig.mutateOnlyOneLink) {
      if (this.links.size !== 0) {
        const linkIndices = Array.from(this.links.keys())
        const randomIndex = Math.floor(Math.random() * linkIndices.length)
        const linkKey = linkIndices[randomIndex] as string
        const link = this.links.get(linkKey)

        if (link != null) {
          link.weight +=
            (Math.random() - 0.5) * 2 * neatConfig.mutateLinkWeightSize
        }
      }
    } else {
      for (const link of this.links.values()) {
        link.weight +=
          (Math.random() - 0.5) * 2 * neatConfig.mutateLinkWeightSize
      }
    }
  }

  mutationAddNode(): void {
    for (let i = 0; i < 50; i++) {
      const linkKeys = Array.from(this.links.keys())
      const randomIndex = Math.floor(Math.random() * linkKeys.length)
      const linkKey = linkKeys[randomIndex]

      if (linkKey == null) {
        continue
      }

      const link = this.links.get(linkKey) as L
      const innovation = this.state.neat().getSplitInnovation(link.innovation)

      const newNodeRef = { type: NodeType.Hidden, id: innovation.nodeNumber }
      const linkFromKey = nodeRefsToLinkKey(link.from, newNodeRef)
      const linkToKey = nodeRefsToLinkKey(newNodeRef, link.to)

      if (!this.links.has(linkFromKey) && !this.links.has(linkToKey)) {
        if (link.to == null || link.from == null) {
          throw new Error('linkToKey includes undefined')
        }
        this.splitLink(
          link.from,
          link.to,
          innovation.nodeNumber,
          innovation.innovationNumber
        )

        break
      }
    }
  }

  mutationAddLink(): void {
    // Select random source and target nodes for new link
    const numSources = this.inputs.size + this.hiddenNodes.size
    const numTargets = this.hiddenNodes.size + this.outputs.size

    if (numSources === 0 || numTargets === 0) {
      return
    }

    const sourceNodes: N[] = []
    const sourceWeights: number[] = []

    for (const node of this.inputs.values()) {
      sourceNodes.push(node)
      sourceWeights.push(numTargets - this.connections.getTargets(node).length)
    }

    for (const node of this.hiddenNodes.values()) {
      sourceNodes.push(node)
      sourceWeights.push(numTargets - this.connections.getTargets(node).length)
    }

    const wheel: number[] = [sourceWeights[0] as number]
    for (let i = 1; i < sourceWeights.length; i++) {
      wheel.push((wheel[i - 1] as number) + (sourceWeights[i] as number))
    }

    // Network is fully saturated with links
    if ((wheel[wheel.length - 1] as number) <= 0) {
      return
    }

    const val =
      Math.floor(Math.random() * (wheel[wheel.length - 1] as number)) + 1
    const sourceIndex = wheel.findIndex((w) => w >= val)
    const source = sourceNodes[sourceIndex] as N

    const targetNodes: N[] = []

    for (const node of this.hiddenNodes.values()) {
      if (!this.links.has(nodeRefsToLinkKey(source, node))) {
        targetNodes.push(node)
      }
    }

    for (const node of this.outputs.values()) {
      if (!this.links.has(nodeRefsToLinkKey(source, node))) {
        targetNodes.push(node)
      }
    }

    shuffle(targetNodes)

    // Try to create link with potential target nodes in random order
    for (const target of targetNodes) {
      if (!this.connections.createsCycle(source, target)) {
        const innovation = this.state
          .neat()
          .getConnectInnovation(source, target)
        const weight =
          (Math.random() - 0.5) * 2.0 * this.config.neat().initialLinkWeightSize

        const link = this.createLink(
          source,
          target,
          weight,
          innovation,
          this.config.link(),
          this.state.link()
        )

        this.insertLink(link, true)
        break
      }
    }
  }

  mutationRemoveLink(): void {
    const linkRefs = Array.from(this.links.keys())

    if (linkRefs.length > 0) {
      const randomIndex = Math.floor(Math.random() * linkRefs.length)
      const selectedLinkRef = linkRefs[randomIndex] as string
      const link = this.links.get(selectedLinkRef) as L
      this.links.delete(selectedLinkRef)
      this.connections.delete(link.from, link.to)
    }
  }

  mutationRemoveNode(): void {
    const nodeRefs = Array.from(this.hiddenNodes.keys())

    if (nodeRefs.length > 0) {
      const randomIndex = Math.floor(Math.random() * nodeRefs.length)
      const selectedNodeRef = nodeRefs[randomIndex] as string
      const node = this.hiddenNodes.get(selectedNodeRef) as N
      this.hiddenNodes.delete(selectedNodeRef)

      const connectionsToRemove = this.connections.deleteNode(node)

      for (const connection of connectionsToRemove) {
        const linkKey = nodeRefsToLinkKey(connection[0], connection[1])
        this.links.delete(linkKey)
      }
    }
  }

  toJSON(): GD {
    const hiddenNodes: Array<GenomeDataNodeEntry<G>> = Array.from(
      this.hiddenNodes.entries()
    ).map(([nodeKey, node]) => [nodeKey, node.toFactoryOptions()])

    const links: Array<GenomeDataLinkEntry<G>> = Array.from(
      this.links.entries()
    ).map(([linkKey, link]) => [
      linkKey,
      [
        nodeRefToKey(link.from),
        nodeRefToKey(link.to),
        link.weight,
        link.innovation,
      ],
    ])

    // FIXME: how to get this typed correctly?
    return {
      config: this.config.toJSON(),
      state: this.state.toJSON(),
      genomeOptions: this.genomeOptions,
      hiddenNodes,
      links,
      isSafe: true,
    } as unknown as GD
  }

  toFactoryOptions(): GFO {
    const hiddenNodes: Array<GenomeDataNodeEntry<G>> = Array.from(
      this.hiddenNodes.entries()
    ).map(([nodeKey, node]) => [nodeKey, node.toFactoryOptions()])

    const links: Array<GenomeDataLinkEntry<G>> = Array.from(
      this.links.entries()
    ).map(([linkKey, link]) => [
      linkKey,
      [
        nodeRefToKey(link.from),
        nodeRefToKey(link.to),
        link.weight,
        link.innovation,
      ],
    ])

    return {
      hiddenNodes,
      links,
      isSafe: true,
    } as unknown as GFO
  }
}
