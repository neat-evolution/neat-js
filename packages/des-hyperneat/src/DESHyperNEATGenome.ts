import {
  CoreGenome,
  type NEATConfigOptions,
  type NodeKey,
  NodeType,
  type InitConfig,
  toLinkKey,
  nodeRefToKey,
} from '@neat-evolution/core'
import type { CPPNGenome, CPPNGenomeOptions } from '@neat-evolution/cppn'
import { threadRNG } from '@neat-evolution/utils'

import type { DESHyperNEATGenomeFactory } from './createGenome.js'
import { createLinkFactory } from './createLink.js'
import { createNodeFactory } from './createNode.js'
import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import type { DESHyperNEATConfig } from './DESHyperNEATConfig.js'
import type { DESHyperNEATConfigData } from './DESHyperNEATConfigData.js'
import type { DESHyperNEATConfigFactoryOptions } from './DESHyperNEATConfigFactoryOptions.js'
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
import type { DESHyperNEATNodeFactoryOptions } from './DESHyperNEATNodeFactoryOptions.js'
import type { DESHyperNEATState } from './DESHyperNEATState.js'
import type { DESHyperNEATStateData } from './DESHyperNEATStateData.js'

export class DESHyperNEATGenome extends CoreGenome<
  DESHyperNEATConfigFactoryOptions,
  NEATConfigOptions,
  NEATConfigOptions,
  DESHyperNEATConfigData,
  DESHyperNEATConfig,
  CustomStateData,
  CustomStateData,
  CustomState,
  CustomState,
  DESHyperNEATStateData,
  DESHyperNEATState,
  DESHyperNEATNodeData,
  DESHyperNEATLinkData,
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATGenomeOptions,
  DESHyperNEATGenomeData,
  DESHyperNEATNodeFactoryOptions,
  DESHyperNEATNode,
  DESHyperNEATLinkFactoryOptions,
  DESHyperNEATLink,
  DESHyperNEATGenome
> {
  constructor(
    config: DESHyperNEATConfig,
    state: DESHyperNEATState,
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
      return node[0] === NodeType.Hidden
        ? this.genomeOptions.staticSubstrateDepth
        : 0
    } else {
      return this.getNodeByKey(node)?.depth
    }
  }

  override async mutate(): Promise<void> {
    await super.mutate()
    const rng = threadRNG()

    const nodeMutProb = 3.0 / this.hiddenNodes.size
    const linkMutProb = 3.0 / this.links.size

    for (const nodeMap of [this.hiddenNodes, this.inputs, this.outputs]) {
      for (const node of nodeMap.values()) {
        if (this.genomeOptions.mutateAllComponents || rng.gen() < nodeMutProb) {
          await node.cppn.mutate()
        }
      }
    }

    for (const link of this.links.values()) {
      if (this.genomeOptions.mutateAllComponents || rng.gen() < linkMutProb) {
        await link.cppn.mutate()
      }
    }

    if (rng.gen() < this.genomeOptions.mutateNodeDepthProbability) {
      const totalSize =
        this.inputs.size + this.hiddenNodes.size + this.outputs.size
      const randomIndex = rng.genRange(0, totalSize)

      let i = 0
      let map: Map<NodeKey, DESHyperNEATNode>
      let limit: number

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
      for (const node of map.values()) {
        if (i === randomIndex) {
          this.mutateNodeDepth(node, limit)
          break
        }
        i++
      }
    }
  }

  mutateNodeDepth(node: DESHyperNEATNode, limit: number): void {
    const rng = threadRNG()
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
    const inputs: DESHyperNEATNodeData[] = []
    const hiddenNodes: DESHyperNEATNodeData[] = []
    const outputs: DESHyperNEATNodeData[] = []
    const links: DESHyperNEATLinkData[] = []
    for (const node of this.inputs.values()) {
      inputs.push([node.id, node.cppn.toFactoryOptions(), node.depth])
    }
    for (const node of this.hiddenNodes.values()) {
      hiddenNodes.push([node.id, node.cppn.toFactoryOptions(), node.depth])
    }
    for (const node of this.outputs.values()) {
      outputs.push([node.id, node.cppn.toFactoryOptions(), node.depth])
    }
    for (const link of this.links.values()) {
      links.push([
        link.from,
        link.to,
        link.weight,
        link.innovation,
        link.cppn.toFactoryOptions(),
        link.depth,
      ])
    }

    return {
      inputs,
      hiddenNodes,
      outputs,
      links,
    }
  }
}
