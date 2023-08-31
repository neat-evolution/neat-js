import type { ConfigProvider } from './config/ConfigProvider.js'
import { Connections } from './genome/Connections.js'
import type { Genome, GenomeData } from './genome/Genome.js'
import type {
  GenomeFactory,
  GenomeFactoryOptions,
} from './genome/GenomeFactory.js'
import type { GenomeOptions } from './genome/GenomeOptions.js'
import {
  toLinkKey,
  type LinkExtension,
  nodeRefsToLinkKey,
  linkRefToKey,
  type LinkRef,
} from './link/Link.js'
import type { LinkFactory } from './link/LinkFactory.js'
import {
  NodeType,
  type NodeRef,
  type NodeExtension,
  nodeRefToKey,
} from './node/Node.js'
import type { NodeFactory } from './node/NodeFactory.js'
import { type State } from './state/State.js'
import { shuffle } from './utils/shuffle.js'

export interface NEATGenomeStats {
  hiddenNodes: number
  links: number
}

export interface NEATGenomeFactoryOptions<
  N extends NodeExtension<any, any, N>,
  L extends LinkExtension<any, any, L>
> extends GenomeFactoryOptions {
  hiddenNodes: Iterable<N> | Array<Omit<NodeRef, 'toJSON'>>
  links: Iterable<L> | Array<Omit<LinkRef, 'toJSON'>>
}

export interface NEATGenomeData<
  N extends NodeExtension<any, any, N>,
  L extends LinkExtension<any, any, L>,
  O extends GenomeOptions,
  FO extends NEATGenomeFactoryOptions<N, L>
> extends GenomeData<N, L, NEATGenomeStats, O, FO, NEATGenome<N, L, O, FO>> {
  hiddenNodes: Array<Omit<NodeRef, 'toJSON'>>
  links: Array<Omit<LinkRef, 'toJSON'>>
  isSafe?: boolean
}

// FIXME: rename to CoreGenome
export class NEATGenome<
  N extends NodeExtension<any, any, N>,
  L extends LinkExtension<any, any, L>,
  O extends GenomeOptions,
  FO extends NEATGenomeFactoryOptions<N, L>
> implements Genome<N, L, NEATGenomeStats, O, FO, NEATGenome<N, L, O, FO>>
{
  public readonly config: ConfigProvider<N['config'], L['config']>
  public readonly state: State<N['state'], L['state']>
  public readonly options: O

  public readonly inputs: Map<string, N>
  public readonly hiddenNodes: Map<string, N>
  public readonly outputs: Map<string, N>
  public readonly links: Map<string, L>
  public readonly connections: Connections

  private readonly createNode: NodeFactory<N['config'], N['state'], N>
  private readonly createLink: LinkFactory<L['config'], L['state'], L>
  private readonly createGenome: GenomeFactory<O, FO, NEATGenome<N, L, O, FO>>

  constructor(
    config: ConfigProvider<N['config'], L['config']>,
    options: O,
    state: State<N['state'], L['state']>,
    createNode: NodeFactory<N['config'], N['state'], N>,
    createLink: LinkFactory<L['config'], L['state'], L>,
    createGenome: GenomeFactory<O, FO, NEATGenome<N, L, O, FO>>,
    factoryOptions?: NEATGenomeFactoryOptions<N, L>
  ) {
    this.config = config
    this.options = options
    this.state = state
    this.createNode = createNode
    this.createLink = createLink
    this.createGenome = createGenome

    this.inputs = new Map<string, N>()
    this.hiddenNodes = new Map<string, N>()
    this.outputs = new Map<string, N>()
    this.links = new Map<string, L>()
    this.connections = new Connections()

    for (const i of Array.from({ length: options.inputs }).keys()) {
      const node = this.createNode(
        NodeType.Input,
        i,
        this.config.node(),
        this.state.node()
      )
      this.inputs.set(nodeRefToKey(node), node)
    }
    for (const i of Array.from({ length: options.outputs }).keys()) {
      const node = this.createNode(
        NodeType.Output,
        i,
        this.config.node(),
        this.state.node()
      )
      this.outputs.set(nodeRefToKey(node), node)
    }
    if (factoryOptions != null) {
      for (const { id, type } of factoryOptions.hiddenNodes) {
        const node = this.createNode(
          type,
          id,
          this.config.node(),
          this.state.node()
        )
        this.hiddenNodes.set(nodeRefToKey(node), node)
      }
      for (const { from, to, weight, innovation } of factoryOptions.links) {
        const fromKey = nodeRefToKey(from)
        const toKey = nodeRefToKey(to)
        if (from.type === NodeType.Hidden && !this.hiddenNodes.has(fromKey)) {
          this.hiddenNodes.set(
            fromKey,
            this.createNode(
              from.type,
              from.id,
              this.config.node(),
              this.state.node()
            )
          )
        }
        if (to.type === NodeType.Hidden && !this.hiddenNodes.has(toKey)) {
          this.hiddenNodes.set(
            toKey,
            this.createNode(
              to.type,
              to.id,
              this.config.node(),
              this.state.node()
            )
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
        this.insertLink(link)
      }
    }
  }

  toJSON(): NEATGenomeData<N, L, O, FO> {
    return {
      config: this.config.toJSON(),
      state: this.state.toJSON(),
      options: this.options,
      hiddenNodes: Array.from(this.hiddenNodes.values()).map(
        (node) => node.toJSON?.() ?? node
      ),
      links: Array.from(this.links.values()).map(
        (link) => link.toJSON?.() ?? link
      ),
      isSafe: true,
    }
  }

  // TODO: require this to be overridden in subclasses
  toFactoryOptions(): FO {
    const hiddenNodes = this.hiddenNodes.values()
    const links = this.links.values()

    return {
      hiddenNodes,
      links,
      isSafe: true,
    } as unknown as FO
  }

  clone(): NEATGenome<N, L, O, FO> {
    return this.createGenome(
      this.config,
      this.options,
      this.state,
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

  distance(other: NEATGenome<N, L, O, FO>): number {
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

  crossover(
    other: NEATGenome<N, L, O, FO>,
    fitness: number,
    otherFitness: number
  ): NEATGenome<N, L, O, FO> {
    // Let parent1 be the fitter parent
    const [parent1, parent2] =
      fitness > otherFitness ? [this, other] : [other, this]

    const genome = this.createGenome(
      parent1.config,
      parent1.options,
      parent1.state
    )

    // Copy links only in fitter parent, perform crossover if in both parents
    for (const [linkRef, link] of parent1.links.entries()) {
      if (parent2.links.has(linkRef)) {
        const link2 = parent2.links.get(linkRef) as L
        genome.insertLink(link.crossover(link2, fitness, otherFitness))
      } else {
        genome.insertLink(link)
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

    return genome as this
  }

  getStats(): NEATGenomeStats {
    return {
      hiddenNodes: this.hiddenNodes.size,
      links: this.links.size,
    }
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

  splitLink(
    from: NodeRef,
    to: NodeRef,
    newNodeId: number,
    innovationNumber: number
  ): void {
    const linkKey = nodeRefsToLinkKey(from, to)
    const link = this.links.get(linkKey)
    if (link == null) {
      throw new Error('unable to split nonexistent link')
    }

    this.links.delete(linkKey)
    this.connections.remove(from, to)

    const newNode = this.createNode(
      NodeType.Hidden,
      newNodeId,
      this.config.node(),
      this.state.node()
    )
    this.hiddenNodes.set(nodeRefToKey(newNode), newNode)

    let link1Details: LinkDetails, link2Details: LinkDetails

    type LinkDetails = [from: NodeRef, to: NodeRef, innovation: number]

    if (from.type === NodeType.Input) {
      link1Details = [newNode, to, innovationNumber + 1]
      link2Details = [from, newNode, innovationNumber]
    } else {
      link1Details = [from, newNode, innovationNumber]
      link2Details = [newNode, to, innovationNumber + 1]
    }

    // FIXME: what is this doing?
    const link1 = link.identity(
      this.createLink(
        link1Details[0],
        link1Details[1],
        1,
        link1Details[2],
        this.config.link(),
        this.state.link()
      )
    )

    // FIXME: what is this doing?
    const link2 = link.cloneWith(
      this.createLink(
        link2Details[0],
        link2Details[1],
        link.weight,
        link2Details[2],
        this.config.link(),
        this.state.link()
      )
    )

    this.insertLink(link1)
    this.insertLink(link2)
  }

  insertLink(link: L): void {
    if (!this.connections.createsCycle(link.from, link.to)) {
      this.links.set(linkRefToKey(link), link)
      this.connections.add(link.from, link.to, link.weight)
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
    const linkKeys = Array.from(this.links.keys())
    const shuffledKeys = shuffle(linkKeys)
    const maxIterations = Math.min(shuffledKeys.length, 50)

    for (let i = 0; i < maxIterations; i++) {
      const selectedLinkKey = shuffledKeys[i] as string
      const link = this.links.get(selectedLinkKey)

      if (link != null) {
        const innovation = this.state.neat().getSplitInnovation(link.innovation)

        const linkFromKey = toLinkKey(
          link.from.type,
          link.from.id,
          NodeType.Hidden,
          innovation.nodeNumber
        )
        const linkToKey = toLinkKey(
          NodeType.Hidden,
          innovation.nodeNumber,
          link.to.type,
          link.to.id
        )

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
  }

  mutationAddLink(): void {
    // Select random source and target nodes for new link
    const numSources = this.inputs.size + this.hiddenNodes.size
    const numTargets = this.hiddenNodes.size + this.outputs.size

    if (numSources === 0 || numTargets === 0) {
      return
    }

    const sourceNodes: N[] = [
      ...this.inputs.values(),
      ...this.hiddenNodes.values(),
    ]
    const sourceWeights: number[] = sourceNodes.map(
      (nodeRef) => numTargets - this.connections.edgeCount(nodeRef)
    )

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

    const targetNodes: N[] = shuffle(
      [...this.hiddenNodes.values(), ...this.outputs.values()].filter(
        (node) =>
          !this.links.has(toLinkKey(source.type, source.id, node.type, node.id))
      )
    )

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

        this.insertLink(link)
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
      this.connections.remove(link.from, link.to)
    }
  }

  mutationRemoveNode(): void {
    const nodeRefs = Array.from(this.hiddenNodes.keys())

    if (nodeRefs.length > 0) {
      const randomIndex = Math.floor(Math.random() * nodeRefs.length)
      const selectedNodeRef = nodeRefs[randomIndex] as string
      const node = this.hiddenNodes.get(selectedNodeRef) as N
      this.hiddenNodes.delete(selectedNodeRef)

      const connectionsToRemove = this.connections.removeNode(node)
      for (const connection of connectionsToRemove) {
        const linkKey = nodeRefsToLinkKey(connection[0], connection[1])
        this.links.delete(linkKey)
      }
    }
  }
}
