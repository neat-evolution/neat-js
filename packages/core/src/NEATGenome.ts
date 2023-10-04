import { binarySearchFirst, shuffle, threadRNG } from '@neat-js/utils'

import type { Config } from './config/Config.js'
import { Connections } from './genome/Connections.js'
import type { Genome } from './genome/Genome.js'
import { type GenomeDataLink } from './genome/GenomeData.js'
import type { GenomeFactory } from './genome/GenomeFactory.js'
import type { GenomeOptions } from './genome/GenomeOptions.js'
import type { Link } from './link/Link.js'
import type { LinkFactory } from './link/LinkFactory.js'
import { linkRefToKey, toLinkKey, type LinkKey } from './link/linkRefToKey.js'
import type { NEATGenomeData } from './NEATGenomeData.js'
import type { NEATGenomeFactoryOptions } from './NEATGenomeFactoryOptions.js'
import type { Node } from './node/Node.js'
import type { NodeFactory } from './node/NodeFactory.js'
import { nodeKeyToRef } from './node/nodeKeyToRef.js'
import type { NodeRef } from './node/NodeRef.js'
import { nodeRefToKey, type NodeKey, toNodeKey } from './node/nodeRefToKey.js'
import { NodeType } from './node/NodeType.js'
import type { StateProvider } from './state/StateProvider.js'

// FIXME: rename to CoreGenome
export class NEATGenome<
  N extends Node<any, any, N>,
  L extends Link<any, any, L>,
  C extends Config<N['config'], L['config']>,
  S extends StateProvider<N['state'], L['state'], S>,
  GO extends GenomeOptions,
  GFO extends NEATGenomeFactoryOptions<N, L, C, S, GO, GFO, GD, G>,
  GD extends NEATGenomeData<N, L, C, S, GO, GFO, GD, G>,
  G extends NEATGenome<N, L, C, S, GO, GFO, GD, G>
> implements Genome<N, L, C, S, GO, GFO, GD, G>
{
  public readonly config: C
  public readonly state: S
  public readonly genomeOptions: GO

  public readonly inputs: Map<NodeKey, N>
  public readonly hiddenNodes: Map<NodeKey, N>
  public readonly outputs: Map<NodeKey, N>
  public readonly links: Map<LinkKey, L>
  public readonly connections: Connections<NodeKey>

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

    this.inputs = new Map<NodeKey, N>()
    this.hiddenNodes = new Map<NodeKey, N>()
    this.outputs = new Map<NodeKey, N>()
    this.links = new Map<LinkKey, L>()
    this.connections = new Connections<NodeKey>()

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
      for (const id of factoryOptions.hiddenNodes) {
        const node = this.createNode(
          NodeType.Hidden,
          id,
          this.config.node(),
          this.state.node()
        )
        this.hiddenNodes.set(nodeRefToKey(node), node)
      }
      for (const [fromKey, toKey, weight, innovation] of factoryOptions.links) {
        const link = this.createLink(
          fromKey,
          toKey,
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

  async mutate(): Promise<void> {
    const neatConfig = this.config.neat()
    const rng = threadRNG()
    if (rng.gen() < neatConfig.addNodeProbability) {
      await this.mutationAddNode()
    }

    if (rng.gen() < neatConfig.addLinkProbability) {
      await this.mutationAddLink()
    }

    if (rng.gen() < neatConfig.removeLinkProbability) {
      this.mutationRemoveLink()
    }

    if (rng.gen() < neatConfig.removeNodeProbability) {
      this.mutationRemoveNode()
    }

    if (rng.gen() < neatConfig.mutateLinkWeightProbability) {
      this.mutateLinkWeight()
    }
  }

  distance(other: G): number {
    const neatConfig = this.config.neat()

    let linkDifferences = 0
    let linkDistance = 0
    let linkCount = this.links.size

    for (const [linkKey, link] of this.links.entries()) {
      const link2 = other.links.get(linkKey)
      if (link2 !== undefined) {
        linkDistance += link.distance(link2)
      } else {
        linkDifferences++
      }
    }

    for (const linkKey of other.links.keys()) {
      if (!this.links.has(linkKey)) {
        linkDifferences++
        linkCount++
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

    for (const [nodeKey, node] of this.hiddenNodes.entries()) {
      const node2 = other.hiddenNodes.get(nodeKey)
      if (node2 !== undefined) {
        nodeDistance += node.distance(node2)
      } else {
        nodeDifferences++
      }
    }

    for (const nodeKey of other.hiddenNodes.keys()) {
      if (!this.hiddenNodes.has(nodeKey)) {
        nodeDifferences++
        nodeCount++
      }
    }

    if (!neatConfig.onlyHiddenNodeDistance) {
      const nodeMaps: Array<[map: Map<string, N>, checkMap: Map<string, N>]> = [
        [this.inputs, other.inputs],
        [this.outputs, other.outputs],
      ]
      for (const [map, checkMap] of nodeMaps) {
        for (const [nodeKey, node] of map.entries()) {
          const node2 = checkMap.get(nodeKey)
          if (node2 !== undefined) {
            nodeDistance += node.distance(node2)
          } else {
            nodeDifferences++
          }
        }
      }
      for (const map of [other.inputs, other.outputs]) {
        for (const nodeKey of map.keys()) {
          if (!this.inputs.has(nodeKey) && !this.outputs.has(nodeKey)) {
            nodeDifferences++
            nodeCount++
          }
        }
      }
    }

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
      this.config,
      this.state,
      this.genomeOptions
    )

    // Copy links only in fitter parent, perform crossover if in both parents
    for (const [linkKey, link] of parent1.links.entries()) {
      const link2 = parent2.links.get(linkKey)
      if (link2 != null) {
        genome.insertLink(link.crossover(link2, fitness, otherFitness), true)
      } else {
        genome.insertLink(link.clone(), false)
      }
    }

    // Copy nodes only in fitter parent, perform crossover if in both parents
    if (parent1.genomeOptions.inputs !== parent2.genomeOptions.inputs) {
      for (const [nodeKey, node] of parent1.inputs.entries()) {
        const node2 = parent2.inputs.get(nodeKey)
        if (node2 != null) {
          genome.inputs.set(
            nodeKey,
            node.crossover(node2, fitness, otherFitness)
          )
        } else {
          genome.inputs.set(nodeKey, node.clone())
        }
      }
    }

    for (const [nodeKey, node] of parent1.hiddenNodes.entries()) {
      const node2 = parent2.hiddenNodes.get(nodeKey)
      if (node2 != null) {
        genome.hiddenNodes.set(
          nodeKey,
          node.crossover(node2, fitness, otherFitness)
        )
      } else {
        genome.hiddenNodes.set(nodeKey, node.clone())
      }
    }

    if (parent1.genomeOptions.outputs !== parent2.genomeOptions.outputs) {
      for (const [nodeKey, node] of parent1.outputs.entries()) {
        const node2 = parent2.outputs.get(nodeKey)
        if (node2 != null) {
          genome.outputs.set(
            nodeKey,
            node.crossover(node2, fitness, otherFitness)
          )
        } else {
          genome.outputs.set(nodeKey, node.clone())
        }
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
    from: NodeKey,
    to: NodeKey,
    /** Innovation.nodeNumber */
    nodeNumber: number,
    /** Innovation.innovationNumber */
    innovationNumber: number
  ): void {
    // Retrieve the link to be split
    const linkKey = toLinkKey(from, to)
    const link = this.links.get(linkKey) as L
    if (link == null) {
      throw new Error('Unable to split nonexistent link')
    }

    // Remove old link and connection
    this.links.delete(linkKey)
    this.connections.delete(from, to)

    const newNodeKey = toNodeKey(NodeType.Hidden, nodeNumber)
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
    this.hiddenNodes.set(newNodeKey, !isSafe ? newNode.clone() : newNode)

    type LinkDetails = [from: NodeKey, to: NodeKey, innovationNumber: number]
    let link1Details: LinkDetails
    let link2Details: LinkDetails

    if (nodeKeyToRef(from).type === NodeType.Input) {
      link1Details = [newNodeKey, to, innovationNumber + 1]
      link2Details = [from, newNodeKey, innovationNumber]
    } else {
      link1Details = [from, newNodeKey, innovationNumber]
      link2Details = [newNodeKey, to, innovationNumber + 1]
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

    // FIXME: why?
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
    if (this.links.size === 0) {
      return
    }
    const neatConfig = this.config.neat()
    const rng = threadRNG()

    if (neatConfig.mutateOnlyOneLink) {
      const linkIndex = rng.genRange(0, this.links.size)
      let i = 0
      for (const link of this.links.values()) {
        if (i === linkIndex) {
          link.weight +=
            (rng.gen() - 0.5) * 2.0 * neatConfig.mutateLinkWeightSize
          break
        }
        i++
      }
    } else {
      for (const link of this.links.values()) {
        link.weight += (rng.gen() - 0.5) * 2 * neatConfig.mutateLinkWeightSize
      }
    }
  }

  async mutationAddNode(): Promise<void> {
    if (this.links.size === 0) {
      return
    }
    for (let i = 0; i < 50; i++) {
      const linkIndex = threadRNG().genRange(0, this.links.size)
      let i = 0
      let link: L | null = null
      for (const l of this.links.values()) {
        if (i === linkIndex) {
          link = l
          break
        }
        i++
      }
      if (link === null) {
        throw new Error('Unable to find link')
      }

      const innovation = await this.state
        .neat()
        .getSplitInnovation(link.innovation)

      const newNodeKey = toNodeKey(NodeType.Hidden, innovation.nodeNumber)
      const linkFromKey = toLinkKey(link.from, newNodeKey)
      const linkToKey = toLinkKey(newNodeKey, link.to)

      if (!this.links.has(linkFromKey) && !this.links.has(linkToKey)) {
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

  async mutationAddLink(): Promise<void> {
    const rng = threadRNG()
    // Select random source and target nodes for new link
    const numSources = this.inputs.size + this.hiddenNodes.size
    const numTargets = this.hiddenNodes.size + this.outputs.size

    if (numSources === 0 || numTargets === 0) {
      return
    }

    const sourceNodes: N[] = []
    const sourceWeights: number[] = []
    const wheel: number[] = []

    for (const nodes of [this.inputs, this.hiddenNodes]) {
      for (const [nodeKey, node] of nodes.entries()) {
        sourceNodes.push(node)
        const edgeCount = this.connections.getTargetsLength(nodeKey)
        const weight = numTargets - edgeCount
        sourceWeights.push(weight)
        wheel.push((wheel[wheel.length - 1] ?? 0) + weight)
      }
    }

    const lastWheelValue = wheel[wheel.length - 1] as number

    // Network is fully saturated with links
    if (lastWheelValue <= 0) {
      return
    }

    const val = rng.genRange(1, lastWheelValue + 1)
    const sourceIndex = binarySearchFirst(wheel, val)
    const source = sourceNodes[sourceIndex] as N
    const sourceKey = nodeRefToKey(source)

    const targetNodes: N[] = []

    for (const nodes of [this.hiddenNodes, this.outputs]) {
      for (const [nodeKey, node] of nodes.entries()) {
        if (!this.links.has(toLinkKey(sourceKey, nodeKey))) {
          targetNodes.push(node)
        }
      }
    }
    shuffle(targetNodes, threadRNG())

    // Try to create link with potential target nodes in random order
    for (const target of targetNodes) {
      const targetKey = nodeRefToKey(target)
      if (!this.connections.createsCycle(sourceKey, targetKey)) {
        const innovation = await this.state
          .neat()
          .getConnectInnovation(source, target)
        const weight =
          (rng.gen() - 0.5) * 2.0 * this.config.neat().initialLinkWeightSize

        const link = this.createLink(
          sourceKey,
          targetKey,
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
    if (this.links.size === 0) {
      return
    }

    const randomIndex = threadRNG().genRange(0, this.links.size)
    let currentIndex = 0

    for (const [linkKey, link] of this.links.entries()) {
      if (currentIndex === randomIndex) {
        this.links.delete(linkKey)
        this.connections.delete(link.from, link.to)
        break
      }
      currentIndex++
    }
  }

  mutationRemoveNode(): void {
    if (this.hiddenNodes.size === 0) {
      return
    }

    const randomIndex = threadRNG().genRange(0, this.hiddenNodes.size)
    let currentIndex = 0

    for (const nodeKey of this.hiddenNodes.keys()) {
      if (currentIndex === randomIndex) {
        this.hiddenNodes.delete(nodeKey)

        for (const connection of this.connections.deleteNode(nodeKey)) {
          this.links.delete(toLinkKey(connection[0], connection[1]))
        }
        break
      }
      currentIndex++
    }
  }

  toJSON(): GD {
    return {
      config: this.config.toJSON(),
      state: this.state.toJSON(),
      genomeOptions: this.genomeOptions,
      ...this.toFactoryOptions(),
    } as unknown as GD
  }

  toFactoryOptions(): GFO {
    const hiddenNodes: number[] = []
    const links: GenomeDataLink[] = []

    for (const node of this.hiddenNodes.values()) {
      hiddenNodes.push(node.id)
    }

    for (const link of this.links.values()) {
      links.push([link.from, link.to, link.weight, link.innovation])
    }

    return {
      hiddenNodes,
      links,
      isSafe: true,
    } as unknown as GFO
  }
}
