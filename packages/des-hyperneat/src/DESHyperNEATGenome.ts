import {
  CoreGenome,
  type InitConfig,
  type NodeKey,
  NodeType,
  nodeKeyToType,
  nodeRefToKey,
  toLinkKey,
} from '@neat-evolution/core'
import type {
  CPPNGenome,
  CPPNGenomeOptions,
  CPPNNode,
} from '@neat-evolution/cppn'
import type { RNG } from '@neat-evolution/utils'
import type { DESHyperNEATGenomeFactory } from './createGenome.js'
import { createLinkFactory } from './createLink.js'
import { createNodeFactory } from './createNode.js'
import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import type { DESHyperNEATGenomeData } from './DESHyperNEATGenomeData.js'
import type {
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATLinkData,
  DESHyperNEATNodeData,
} from './DESHyperNEATGenomeFactoryOptions.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import type { DESHyperNEATLink } from './DESHyperNEATLink.js'
import type { DESHyperNEATLinkFactoryOptions } from './DESHyperNEATLinkFactoryOptions.js'
import type { DESHyperNEATNode } from './DESHyperNEATNode.js'
import { insertIdentity } from './genome/insertIdentity.js'

export class DESHyperNEATGenome extends CoreGenome<DESHyperNEATContext> {
  constructor(
    config: DESHyperNEATContext['Config']['Type'],
    state: DESHyperNEATContext['State']['Type'],
    genomeOptions: DESHyperNEATGenomeOptions,
    initConfig: InitConfig,
    createGenome: DESHyperNEATGenomeFactory,
    factoryOptions?: DESHyperNEATGenomeFactoryOptions
  ) {
    const createNode = createNodeFactory(genomeOptions)
    const createLink = createLinkFactory(genomeOptions)
    super(
      config,
      state,
      genomeOptions,
      initConfig,
      createNode,
      createLink,
      createGenome,
      factoryOptions
    )
  }

  protected override init(
    factoryOptions?: DESHyperNEATGenomeFactoryOptions
  ): void {
    if (factoryOptions != null) {
      for (const [id, cppn, depth] of factoryOptions.inputs) {
        const node = this.createNode(
          { type: NodeType.Input, id, cppn, depth },
          this.config.node(),
          this.state.node()
        )
        this.inputs.set(nodeRefToKey(node), node)
      }
      for (const [id, cppn, depth] of factoryOptions.hiddenNodes) {
        const node = this.createNode(
          { type: NodeType.Hidden, id, cppn, depth },
          this.config.node(),
          this.state.node()
        )
        this.hiddenNodes.set(nodeRefToKey(node), node)
      }
      for (const [id, cppn, depth] of factoryOptions.outputs) {
        const node = this.createNode(
          { type: NodeType.Output, id, cppn, depth },
          this.config.node(),
          this.state.node()
        )
        this.outputs.set(nodeRefToKey(node), node)
      }
      for (const [
        fromKey,
        toKey,
        weight,
        innovation,
        cppn,
        depth,
      ] of factoryOptions.links) {
        const linkFactoryOptions: DESHyperNEATLinkFactoryOptions = {
          from: fromKey,
          to: toKey,
          weight,
          innovation,
          cppn,
          depth,
        }
        const link = this.createLink(
          linkFactoryOptions,
          this.config.link(),
          this.state.link()
        )
        this.insertLink(link, true)
      }
    } else {
      super.init(factoryOptions)
    }
  }

  getNodeCPPN(node: NodeKey): CPPNGenome<CPPNGenomeOptions> | undefined {
    return this.getNodeByKey(node)?.cppn
  }

  getLinkCPPN(
    source: NodeKey,
    target: NodeKey
  ): CPPNGenome<CPPNGenomeOptions> | undefined {
    const linkKey = toLinkKey(source, target)
    return this.links.get(linkKey)?.cppn
  }

  getDepth(node: NodeKey): number | undefined {
    if (this.genomeOptions.staticSubstrateDepth >= 0) {
      return nodeKeyToType(node) === NodeType.Hidden
        ? this.genomeOptions.staticSubstrateDepth
        : 0
    } else {
      return this.getNodeByKey(node)?.depth
    }
  }

  override async mutationAddLink(rng: RNG): Promise<void> {
    const sizeBefore = this.links.size
    await super.mutationAddLink(rng)

    // Initialize new link CPPNs with identity mapping so they produce
    // spatially-meaningful substrate connections from the start.
    // Without this, new links get bare random CPPNs that may never produce
    // outputs above the weight threshold, leaving the substrate empty.
    // After identity init, randomize all CPPN weights and biases so the
    // population has diverse link CPPNs from the start. Without this, every
    // organism gets identical distance-function CPPNs.
    if (
      this.genomeOptions.enableIdentityMapping &&
      this.links.size > sizeBefore
    ) {
      for (const link of this.links.values()) {
        const desLink = link as DESHyperNEATLink
        if (desLink.cppn.links.size === 0) {
          await insertIdentity(desLink.cppn, 0)
          // Perturb all CPPN link weights
          for (const cppnLink of desLink.cppn.links.values()) {
            cppnLink.weight += (rng.gen() - 0.5) * 2.0
            desLink.cppn.connections.setEdge(
              cppnLink.from,
              cppnLink.to,
              cppnLink.weight
            )
          }
          // Perturb all non-input node biases
          for (const nodeMap of [
            desLink.cppn.hiddenNodes,
            desLink.cppn.outputs,
          ]) {
            for (const node of nodeMap.values()) {
              ;(node as CPPNNode).bias += (rng.gen() - 0.5) * 0.5
            }
          }
        }
      }
    }
  }

  override async mutate(rng: RNG): Promise<void> {
    await super.mutate(rng)

    const nodeMutProb =
      3.0 /
      Math.max(1, this.hiddenNodes.size + this.inputs.size + this.outputs.size)
    const linkMutProb = 3.0 / Math.max(1, this.links.size)

    for (const nodeMap of [this.hiddenNodes, this.inputs, this.outputs]) {
      for (const node of nodeMap.values()) {
        if (this.genomeOptions.mutateAllComponents || rng.gen() < nodeMutProb) {
          await node.cppn.mutate(rng)
        }
      }
    }

    for (const link of this.links.values()) {
      if (this.genomeOptions.mutateAllComponents || rng.gen() < linkMutProb) {
        await link.cppn.mutate(rng)
      }
    }

    if (rng.gen() < this.genomeOptions.mutateNodeDepthProbability) {
      const totalSize =
        this.inputs.size + this.hiddenNodes.size + this.outputs.size
      if (totalSize > 0) {
        const randomIndex = rng.genIntRange(0, totalSize)

        let i = 0
        let map: Map<NodeKey, DESHyperNEATNode> | undefined
        let limit: number = 0

        if (randomIndex < this.inputs.size) {
          map = this.inputs
          limit = this.genomeOptions.maxInputSubstrateDepth
        } else if (randomIndex < this.inputs.size + this.hiddenNodes.size) {
          map = this.hiddenNodes
          limit = this.genomeOptions.maxHiddenSubstrateDepth
          i = this.inputs.size
        } else {
          map = this.outputs
          limit = this.genomeOptions.maxOutputSubstrateDepth
          i = this.inputs.size + this.hiddenNodes.size
        }

        if (map !== undefined) {
          for (const node of map.values()) {
            if (i === randomIndex) {
              this.mutateNodeDepth(node, limit, rng)
              break
            }
            i++
          }
        }
      }
    }
  }

  mutateNodeDepth(node: DESHyperNEATNode, limit: number, rng: RNG): void {
    if (limit === 0) {
      node.depth = 0
      return
    }

    if (node.depth === 0) {
      node.depth += 1
    } else if (node.depth === limit) {
      node.depth -= 1
    } else {
      node.depth = rng.genBool() ? node.depth + 1 : node.depth - 1
    }

    node.depth = Math.min(limit, Math.max(0, node.depth))
  }

  override toJSON(): DESHyperNEATGenomeData {
    return {
      config: this.config.toJSON(),
      state: this.state.toJSON(),
      genomeOptions: this.genomeOptions,
      factoryOptions: this.toFactoryOptions(),
    }
  }

  override toFactoryOptions(): DESHyperNEATGenomeFactoryOptions {
    const inputs: DESHyperNEATNodeData[] = new Array(this.inputs.size)
    const hiddenNodes: DESHyperNEATNodeData[] = new Array(this.hiddenNodes.size)
    const outputs: DESHyperNEATNodeData[] = new Array(this.outputs.size)
    const links: DESHyperNEATLinkData[] = new Array(this.links.size)

    let i = 0
    for (const node of this.inputs.values()) {
      inputs[i++] = [node.id, node.cppn.toFactoryOptions(), node.depth]
    }
    i = 0
    for (const node of this.hiddenNodes.values()) {
      hiddenNodes[i++] = [node.id, node.cppn.toFactoryOptions(), node.depth]
    }
    i = 0
    for (const node of this.outputs.values()) {
      outputs[i++] = [node.id, node.cppn.toFactoryOptions(), node.depth]
    }
    i = 0
    for (const link of this.links.values()) {
      links[i++] = [
        link.from,
        link.to,
        link.weight,
        link.innovation,
        link.cppn.toFactoryOptions(),
        link.depth,
      ]
    }

    return {
      inputs,
      hiddenNodes,
      outputs,
      links,
    }
  }
}
