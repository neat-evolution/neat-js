import { binarySearchFirst, shuffle, threadRNG } from '@neat-evolution/utils'

import type { ConfigData } from './config/ConfigData.js'
import type { ConfigFactoryOptions } from './config/ConfigFactoryOptions.js'
import type { ConfigOptions } from './config/ConfigOptions.js'
import type { CoreConfig } from './config/CoreConfig.js'
import { Connections } from './Connections.js'
import type { Genome } from './genome/Genome.js'
import type { GenomeData } from './genome/GenomeData.js'
import type { GenomeFactory } from './genome/GenomeFactory.js'
import type { GenomeFactoryOptions } from './genome/GenomeFactoryOptions.js'
import type { GenomeOptions } from './genome/GenomeOptions.js'
import type { InitConfig } from './genome/InitConfig.js'
import type { CoreLink } from './link/CoreLink.js'
import type { LinkFactory } from './link/LinkFactory.js'
import type { LinkFactoryOptions } from './link/LinkFactoryOptions.js'
import { linkRefToKey, toLinkKey, type LinkKey } from './link/linkRefToKey.js'
import type { CoreNode } from './node/CoreNode.js'
import type { NodeFactory } from './node/NodeFactory.js'
import type { NodeFactoryOptions } from './node/NodeFactoryOptions.js'
import { nodeKeyToType } from './node/nodeKeyToRef.js'
import type { NodeRef } from './node/NodeRef.js'
import { nodeRefToKey, type NodeKey, toNodeKey } from './node/nodeRefToKey.js'
import { NodeType } from './node/NodeType.js'
import type { CoreState } from './state/CoreState.js'
import type { StateData } from './state/StateData.js'
import type { ExtendedState } from './state/StateProvider.js'

export class CoreGenome<
  // Genome
  CFO extends ConfigFactoryOptions,
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  CD extends ConfigData,
  C extends CoreConfig<CFO, NCO, LCO, CD>,
  NSD,
  LSD,
  NS extends ExtendedState<NSD>,
  LS extends ExtendedState<LSD>,
  SD extends StateData,
  S extends CoreState<NSD, LSD, NS, LS, SD>,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions,
  GD extends GenomeData<CD, SD, HND, LD, GFO, GO>,
  // CoreNode
  NFO extends NodeFactoryOptions,
  N extends CoreNode<NFO, NCO, NSD, NS, N>,
  // CoreLink
  LFO extends LinkFactoryOptions,
  L extends CoreLink<LFO, LCO, LSD, LS, L>,
  // CoreGenome
  G extends CoreGenome<
    CFO,
    NCO,
    LCO,
    CD,
    C,
    NSD,
    LSD,
    NS,
    LS,
    SD,
    S,
    HND,
    LD,
    GFO,
    GO,
    GD,
    NFO,
    N,
    LFO,
    L,
    G
  >,
> implements
    Genome<NCO, LCO, CD, C, NSD, LSD, NS, LS, SD, S, HND, LD, GFO, GO, GD, G>
{
  public readonly config: C
  public readonly state: S
  public readonly genomeOptions: GO
  public readonly initConfig: InitConfig

  public readonly inputs: Map<NodeKey, N>
  public readonly hiddenNodes: Map<NodeKey, N>
  public readonly outputs: Map<NodeKey, N>
  public readonly links: Map<LinkKey, L>
  public readonly connections: Connections<NodeKey, number>

  public readonly createNode: NodeFactory<NFO, NCO, NSD, NS, N>
  public readonly createLink: LinkFactory<LFO, LCO, LSD, LS, L>
  public readonly createGenome: GenomeFactory<
    NCO,
    LCO,
    CD,
    C,
    NSD,
    LSD,
    NS,
    LS,
    SD,
    S,
    HND,
    LD,
    GFO,
    GO,
    G
  >

  constructor(
    config: C,
    state: S,
    genomeOptions: GO,
    initConfig: InitConfig,
    createNode: NodeFactory<NFO, NCO, NSD, NS, N>,
    createLink: LinkFactory<LFO, LCO, LSD, LS, L>,
    createGenome: GenomeFactory<
      NCO,
      LCO,
      CD,
      C,
      NSD,
      LSD,
      NS,
      LS,
      SD,
      S,
      HND,
      LD,
      GFO,
      GO,
      G
    >,
    factoryOptions?: GFO
  ) {
    this.config = config
    this.genomeOptions = genomeOptions
    this.initConfig = initConfig
    this.state = state
    this.createNode = createNode
    this.createLink = createLink
    this.createGenome = createGenome

    this.inputs = new Map<NodeKey, N>()
    this.hiddenNodes = new Map<NodeKey, N>()
    this.outputs = new Map<NodeKey, N>()
    this.links = new Map<LinkKey, L>()
    this.connections = new Connections<NodeKey, number>()

    this.init(factoryOptions)
  }

  protected init(_factoryOptions?: GFO): void {
    for (let i = 0; i < this.initConfig.inputs; i++) {
      const node = this.createNode(
        { type: NodeType.Input, id: i },
        this.config.node(),
        this.state.node()
      )
      this.inputs.set(nodeRefToKey(node), node)
    }

    for (let i = 0; i < this.initConfig.outputs; i++) {
      const node = this.createNode(
        { type: NodeType.Output, id: i },
        this.config.node(),
        this.state.node()
      )
      this.outputs.set(nodeRefToKey(node), node)
    }
  }

  clone(): G {
    return this.createGenome(
      this.config,
      this.state,
      this.genomeOptions,
      this.initConfig,
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
      this.genomeOptions,
      this.initConfig
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
    if (parent1.initConfig.inputs !== parent2.initConfig.inputs) {
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

    if (parent1.initConfig.outputs !== parent2.initConfig.outputs) {
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

  /**
   * @deprecated prefer getNodeByKey(nodeKey) to avoid unnecessary conversions
   * @param {NodeRef} nodeRef the reference to the node
   * @returns {N | undefined} a node or undefined
   */
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
      case NodeType.Input:
        return this.inputs.get(nodeKey)
      case NodeType.Hidden:
        return this.hiddenNodes.get(nodeKey)
      case NodeType.Output:
        return this.outputs.get(nodeKey)
      default:
        return undefined
    }
  }

  async splitLink(
    from: NodeKey,
    to: NodeKey,
    /** Innovation.nodeNumber */
    nodeNumber: number,
    /** Innovation.innovationNumber */
    innovationNumber: number
  ): Promise<void> {
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
        { type: NodeType.Hidden, id: nodeNumber },
        this.config.node(),
        this.state.node()
      )

    // Insert new hidden node
    this.hiddenNodes.set(newNodeKey, !isSafe ? newNode.clone() : newNode)

    type LinkDetails = [from: NodeKey, to: NodeKey, innovationNumber: number]
    let link1Details: LinkDetails
    let link2Details: LinkDetails

    if (nodeKeyToType(from) === NodeType.Input) {
      link1Details = [newNodeKey, to, innovationNumber + 1]
      link2Details = [from, newNodeKey, innovationNumber]
    } else {
      link1Details = [from, newNodeKey, innovationNumber]
      link2Details = [newNodeKey, to, innovationNumber + 1]
    }
    // NOTE: only async in des-hyperneat
    const link1 = await link.identity({
      from: link1Details[0],
      to: link1Details[1],
      weight: 1.0,
      innovation: link1Details[2],
    })
    const link2 = link.cloneWith({
      from: link2Details[0],
      to: link2Details[1],
      weight: link.weight,
      innovation: link2Details[2],
    })
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
        await this.splitLink(
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
          .getConnectInnovation(sourceKey, targetKey)
        const weight =
          (rng.gen() - 0.5) * 2.0 * this.config.neat().initialLinkWeightSize

        const linkFactoryOptions: LinkFactoryOptions = {
          from: sourceKey,
          to: targetKey,
          weight,
          innovation,
        }
        const link = this.createLink(
          linkFactoryOptions,
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
    throw new Error('toJSON not implemented.')
  }

  toFactoryOptions(): GFO {
    throw new Error('toFactoryOptions not implemented.')
  }
}
