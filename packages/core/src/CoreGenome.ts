import { binarySearchFirst, shuffle, threadRNG } from '@neat-evolution/utils'
import { Connections } from './Connections.js'
import type { AlgorithmContext } from './contexts/AlgorithmContext.js'
import type {
  ConfigTypeOf,
  GenomeDataOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  GenomeTypeOf,
  LinkTypeOf,
  NodeTypeOf,
  StateTypeOf,
} from './contexts/helpers.js'
import type { Genome } from './genome/Genome.js'
import type { GenomeFactory } from './genome/GenomeFactory.js'
import type { InitConfig } from './genome/InitConfig.js'
import type { LinkFactory } from './link/LinkFactory.js'
import type { LinkFactoryOptions } from './link/LinkFactoryOptions.js'
import { type LinkKey, linkRefToKey, toLinkKey } from './link/linkRefToKey.js'
import type { NodeFactory } from './node/NodeFactory.js'
import type { NodeRef } from './node/NodeRef.js'
import { NodeType } from './node/NodeType.js'
import { nodeKeyToId, nodeKeyToType } from './node/nodeKeyToRef.js'
import { type NodeKey, nodeRefToKey } from './node/nodeRefToKey.js'
import type { InnovationKey } from './state/hashInnovationKey.js'

export class CoreGenome<Ctx extends AlgorithmContext> implements Genome<Ctx> {
  public readonly config: ConfigTypeOf<Ctx>
  public readonly state: StateTypeOf<Ctx>
  public readonly genomeOptions: GenomeOptionsOf<Ctx>
  public readonly initConfig: InitConfig

  public readonly inputs: Map<NodeKey, NodeTypeOf<Ctx>>
  public readonly hiddenNodes: Map<NodeKey, NodeTypeOf<Ctx>>
  public readonly outputs: Map<NodeKey, NodeTypeOf<Ctx>>
  public readonly links: Map<LinkKey, LinkTypeOf<Ctx>>
  public readonly connections: Connections<NodeKey, number>

  public readonly createNode: NodeFactory<Ctx>
  public readonly createLink: LinkFactory<Ctx>
  public readonly createGenome: GenomeFactory<Ctx>

  constructor(
    config: ConfigTypeOf<Ctx>,
    state: StateTypeOf<Ctx>,
    genomeOptions: GenomeOptionsOf<Ctx>,
    initConfig: InitConfig,
    createNode: NodeFactory<Ctx>,
    createLink: LinkFactory<Ctx>,
    createGenome: GenomeFactory<Ctx>,
    factoryOptions?: GenomeFactoryOptionsOf<Ctx>
  ) {
    this.config = config
    this.genomeOptions = genomeOptions
    this.initConfig = initConfig
    this.state = state
    this.createNode = createNode
    this.createLink = createLink
    this.createGenome = createGenome

    this.inputs = new Map<NodeKey, NodeTypeOf<Ctx>>()
    this.hiddenNodes = new Map<NodeKey, NodeTypeOf<Ctx>>()
    this.outputs = new Map<NodeKey, NodeTypeOf<Ctx>>()
    this.links = new Map<LinkKey, LinkTypeOf<Ctx>>()
    this.connections = new Connections<NodeKey, number>()

    this.init(factoryOptions)
  }

  protected init(factoryOptions?: GenomeFactoryOptionsOf<Ctx>): void {
    const inputsCount = this.initConfig.inputs
    for (let i = 0; i < inputsCount; i++) {
      const node = this.createNode(
        { type: NodeType.Input, id: i },
        this.config.node(),
        this.state.node()
      )
      this.inputs.set(nodeRefToKey(node), node)
    }

    const outputsCount = this.initConfig.outputs
    for (let i = 0; i < outputsCount; i++) {
      const node = this.createNode(
        { type: NodeType.Output, id: i },
        this.config.node(),
        this.state.node()
      )
      this.outputs.set(nodeRefToKey(node), node)
    }

    if (factoryOptions != null) {
      // Inlined hydration for better performance and simplicity
      this.hydrate(factoryOptions)
    }
  }

  protected hydrate(_factoryOptions: GenomeFactoryOptionsOf<Ctx>): void {
    // To be implemented in subclasses if they use specialized factory options
  }

  clone(): GenomeTypeOf<Ctx> {
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

  distance(other: GenomeTypeOf<Ctx>): number {
    const neatConfig = this.config.neat()

    let linkDifferences = 0
    let weightDistance = 0
    let linkMatchingCount = 0

    const thisLinks = this.links
    const otherLinks = other.links

    for (const [linkKey, link] of thisLinks) {
      const link2 = otherLinks.get(linkKey)
      if (link2 !== undefined) {
        weightDistance += link.distance(link2)
        linkMatchingCount++
      } else {
        linkDifferences++
      }
    }

    linkDifferences += otherLinks.size - linkMatchingCount
    const linkUnionSize = thisLinks.size + otherLinks.size - linkMatchingCount
    const linkDist =
      linkUnionSize === 0
        ? 0
        : (linkDifferences + weightDistance) / linkUnionSize

    let nodeDifferences = 0
    let nodeDistance = 0
    let nodeMatchingCount = 0

    const nodeMaps: Array<
      [Map<NodeKey, NodeTypeOf<Ctx>>, Map<NodeKey, NodeTypeOf<Ctx>>]
    > = [[this.hiddenNodes, other.hiddenNodes]]
    if (!neatConfig.onlyHiddenNodeDistance) {
      nodeMaps.push([this.inputs, other.inputs])
      nodeMaps.push([this.outputs, other.outputs])
    }

    let thisNodeCount = 0
    let otherNodeCount = 0

    for (let i = 0; i < nodeMaps.length; i++) {
      const nodeMapPair = nodeMaps[i]
      if (nodeMapPair == null) {
        continue
      }
      const [map1, map2] = nodeMapPair
      thisNodeCount += map1.size
      otherNodeCount += map2.size

      for (const [nodeKey, node] of map1) {
        const node2 = map2.get(nodeKey)
        if (node2 !== undefined) {
          nodeDistance += node.distance(node2)
          nodeMatchingCount++
        } else {
          nodeDifferences++
        }
      }
    }

    nodeDifferences += otherNodeCount - nodeMatchingCount
    const nodeUnionSize = thisNodeCount + otherNodeCount - nodeMatchingCount

    const nodeDist =
      nodeUnionSize === 0 ? 0 : (nodeDifferences + nodeDistance) / nodeUnionSize

    return (
      neatConfig.linkDistanceWeight * linkDist +
      (1 - neatConfig.linkDistanceWeight) * nodeDist
    )
  }

  crossover(
    other: GenomeTypeOf<Ctx>,
    fitness: number,
    otherFitness: number
  ): GenomeTypeOf<Ctx> {
    const [parent1, parent2] =
      fitness > otherFitness ? [this, other] : [other, this]

    const genome = this.createGenome(
      this.config,
      this.state,
      this.genomeOptions,
      this.initConfig
    )

    const parent2Links = parent2.links
    for (const [linkKey, link] of parent1.links) {
      const link2 = parent2Links.get(linkKey)
      if (link2 !== undefined) {
        genome.insertLink(link.crossover(link2, fitness, otherFitness), true)
      } else {
        genome.insertLink(link.clone(), true)
      }
    }

    if (parent1.initConfig.inputs !== parent2.initConfig.inputs) {
      const parent2Inputs = parent2.inputs
      for (const [nodeKey, node] of parent1.inputs) {
        const node2 = parent2Inputs.get(nodeKey)
        if (node2 !== undefined) {
          genome.inputs.set(
            nodeKey,
            node.crossover(node2, fitness, otherFitness)
          )
        } else {
          genome.inputs.set(nodeKey, node.clone())
        }
      }
    }

    const parent2Hidden = parent2.hiddenNodes
    for (const [nodeKey, node] of parent1.hiddenNodes) {
      const node2 = parent2Hidden.get(nodeKey)
      if (node2 !== undefined) {
        genome.hiddenNodes.set(
          nodeKey,
          node.crossover(node2, fitness, otherFitness)
        )
      } else {
        genome.hiddenNodes.set(nodeKey, node.clone())
      }
    }

    if (parent1.initConfig.outputs !== parent2.initConfig.outputs) {
      const parent2Outputs = parent2.outputs
      for (const [nodeKey, node] of parent1.outputs) {
        const node2 = parent2Outputs.get(nodeKey)
        if (node2 !== undefined) {
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

  getNode(nodeRef: NodeRef): NodeTypeOf<Ctx> | undefined {
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

  getNodeByKey(nodeKey: NodeKey): NodeTypeOf<Ctx> | undefined {
    const type = nodeKeyToType(nodeKey)
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
    newNodeKey: NodeKey
  ): Promise<void> {
    const linkKey = toLinkKey(from, to)
    const link = this.links.get(linkKey) as LinkTypeOf<Ctx>
    if (link == null) {
      throw new Error('Unable to split nonexistent link')
    }

    this.links.delete(linkKey)
    this.connections.delete(from, to)

    const isSafe = !this.hiddenNodes.has(newNodeKey)
    const newNode =
      this.hiddenNodes.get(newNodeKey) ??
      this.createNode(
        { type: nodeKeyToType(newNodeKey), id: nodeKeyToId(newNodeKey) },
        this.config.node(),
        this.state.node()
      )

    this.hiddenNodes.set(newNodeKey, !isSafe ? newNode.clone() : newNode)

    type LinkDetails = [
      from: NodeKey,
      to: NodeKey,
      innovationNumber: InnovationKey,
    ]
    let link1Details: LinkDetails
    let link2Details: LinkDetails

    if (nodeKeyToType(from) === NodeType.Input) {
      link1Details = [
        newNodeKey,
        to,
        await this.state.getConnectInnovation(newNodeKey, to),
      ]
      link2Details = [
        from,
        newNodeKey,
        await this.state.getConnectInnovation(from, newNodeKey),
      ]
    } else {
      link1Details = [
        from,
        newNodeKey,
        await this.state.getConnectInnovation(from, newNodeKey),
      ]
      link2Details = [
        newNodeKey,
        to,
        await this.state.getConnectInnovation(newNodeKey, to),
      ]
    }
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

  insertLink(link: LinkTypeOf<Ctx>, isSafe?: boolean): void {
    const knownNotToCreateCycle =
      isSafe === true || !this.connections.createsCycle(link.from, link.to)

    if (knownNotToCreateCycle) {
      this.links.set(linkRefToKey(link), link)
      this.connections.add(link.from, link.to, link.weight, true)
    }
  }

  mutateLinkWeight(): void {
    const linkSize = this.links.size
    if (linkSize === 0) {
      return
    }
    const neatConfig = this.config.neat()
    const rng = threadRNG()

    if (neatConfig.mutateOnlyOneLink) {
      const linkIndex = rng.genRange(0, linkSize)
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
      const weightSize = neatConfig.mutateLinkWeightSize
      for (const link of this.links.values()) {
        link.weight += (rng.gen() - 0.5) * 2 * weightSize
      }
    }
  }

  async mutationAddNode(): Promise<void> {
    const linkSize = this.links.size
    if (linkSize === 0) {
      return
    }
    const linksArray = Array.from(this.links.values())
    const rng = threadRNG()

    for (let i = 0; i < 50; i++) {
      const linkIndex = rng.genRange(0, linkSize)
      const link = linksArray[linkIndex]
      if (link == null) {
        continue
      }

      const newNodeKey = await this.state
        .neat()
        .getSplitInnovation(link.innovation)

      const linkFromKey = toLinkKey(link.from, newNodeKey)
      const linkToKey = toLinkKey(newNodeKey, link.to)

      if (!this.links.has(linkFromKey) && !this.links.has(linkToKey)) {
        await this.splitLink(link.from, link.to, newNodeKey)
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

    const sourceNodes: NodeTypeOf<Ctx>[] = []
    const wheel: number[] = []

    for (const nodes of [this.inputs, this.hiddenNodes]) {
      for (const [nodeKey, node] of nodes) {
        const edgeCount = this.connections.getTargetsLength(nodeKey)
        const weight = numTargets - edgeCount
        if (weight > 0) {
          sourceNodes.push(node)
          wheel.push((wheel[wheel.length - 1] ?? 0) + weight)
        }
      }
    }

    const lastWheelValue = wheel[wheel.length - 1] ?? 0

    if (lastWheelValue <= 0) {
      return
    }

    const val = rng.genRange(1, lastWheelValue + 1)
    const sourceIndex = binarySearchFirst(wheel, val)
    const source = sourceNodes[sourceIndex]
    if (source == null) {
      return
    }
    const sourceKey = nodeRefToKey(source)

    const targetNodes: NodeTypeOf<Ctx>[] = []

    for (const nodes of [this.hiddenNodes, this.outputs]) {
      for (const [nodeKey, node] of nodes) {
        if (!this.links.has(toLinkKey(sourceKey, nodeKey))) {
          targetNodes.push(node)
        }
      }
    }
    shuffle(targetNodes, rng)

    for (let i = 0; i < targetNodes.length; i++) {
      const target = targetNodes[i]
      if (target == null) {
        continue
      }
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
    const linkSize = this.links.size
    if (linkSize === 0) {
      return
    }

    const randomIndex = threadRNG().genRange(0, linkSize)
    let currentIndex = 0

    for (const [linkKey, link] of this.links) {
      if (currentIndex === randomIndex) {
        this.links.delete(linkKey)
        this.connections.delete(link.from, link.to)
        break
      }
      currentIndex++
    }
  }

  mutationRemoveNode(): void {
    const hiddenSize = this.hiddenNodes.size
    if (hiddenSize === 0) {
      return
    }

    const randomIndex = threadRNG().genRange(0, hiddenSize)
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

  toJSON(): GenomeDataOf<Ctx> {
    throw new Error('toJSON not implemented.')
  }

  toFactoryOptions(): GenomeFactoryOptionsOf<Ctx> {
    throw new Error('toFactoryOptions not implemented.')
  }
}
