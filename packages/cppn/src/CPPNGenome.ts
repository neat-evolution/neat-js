import {
  NodeType,
  type Activation,
  CoreGenome,
  type NodeKey,
  nodeKeyToType,
  type InitConfig,
  type StateData,
  type LinkFactoryOptions,
  nodeRefToKey,
  type ConfigFactoryOptions,
  type ConfigData,
} from '@neat-js/core'
import {
  createLink,
  type NEATConfig,
  type NEATLink,
  type NEATLinkData,
  type NEATState,
} from '@neat-js/neat'
import { threadRNG } from '@neat-js/utils'

import type { CPPNGenomeData } from './CPPNGenomeData.js'
import type {
  CPPNGenomeFactoryOptions,
  CPPNNodeData,
} from './CPPNGenomeFactoryOptions.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import type { CPPNNode } from './CPPNNode.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'
import { type CPPNGenomeFactory } from './createGenome.js'
import { createNodeFactory } from './createNode.js'

export class CPPNGenome<GO extends CPPNGenomeOptions> extends CoreGenome<
  ConfigFactoryOptions,
  null,
  null,
  ConfigData,
  NEATConfig,
  null,
  null,
  null,
  null,
  StateData,
  NEATState,
  CPPNNodeData,
  NEATLinkData,
  CPPNGenomeFactoryOptions,
  GO,
  CPPNGenomeData<GO>,
  CPPNNodeFactoryOptions,
  CPPNNode,
  LinkFactoryOptions,
  NEATLink,
  CPPNGenome<GO>
> {
  constructor(
    config: NEATConfig,
    state: NEATState,
    options: GO,
    initConfig: InitConfig,
    createGenome: CPPNGenomeFactory<GO>,
    factoryOptions?: CPPNGenomeFactoryOptions
  ) {
    const createNode = createNodeFactory(options)
    super(
      config,
      state,
      options,
      initConfig,
      createNode,
      createLink,
      createGenome,
      factoryOptions
    )
  }

  protected override init(factoryOptions?: CPPNGenomeFactoryOptions): void {
    for (let i = 0; i < this.initConfig.inputs; i++) {
      const node = this.createNode(
        { type: NodeType.Input, id: i },
        this.config.node(),
        this.state.node()
      )
      this.inputs.set(nodeRefToKey(node), node)
    }

    if (factoryOptions != null) {
      for (const [id, bias, activation] of factoryOptions.hiddenNodes) {
        const node = this.createNode(
          { type: NodeType.Hidden, id, bias, activation },
          this.config.node(),
          this.state.node()
        )
        this.hiddenNodes.set(nodeRefToKey(node), node)
      }
      for (const [id, bias, activation] of factoryOptions.outputs) {
        const node = this.createNode(
          { type: NodeType.Output, id, bias, activation },
          this.config.node(),
          this.state.node()
        )
        this.outputs.set(nodeRefToKey(node), node)
      }
      for (const [fromKey, toKey, weight, innovation] of factoryOptions.links) {
        const linkFactoryOptions: LinkFactoryOptions = {
          from: fromKey,
          to: toKey,
          weight,
          innovation,
        }
        const link = this.createLink(
          linkFactoryOptions,
          this.config.link(),
          this.state.link()
        )
        this.insertLink(link, true)
      }
    } else {
      for (let i = 0; i < this.initConfig.outputs; i++) {
        const node = this.createNode(
          { type: NodeType.Output, id: i },
          this.config.node(),
          this.state.node()
        )
        this.outputs.set(nodeRefToKey(node), node)
      }
    }
  }

  override async mutate(): Promise<void> {
    await super.mutate()

    const rng = threadRNG()

    if (rng.gen() < this.genomeOptions.mutateHiddenBiasProbability) {
      this.mutateHiddenBias()
    }

    if (rng.gen() < this.genomeOptions.mutateHiddenActivationProbability) {
      this.mutateHiddenActivation()
    }

    if (rng.gen() < this.genomeOptions.mutateOutputBiasProbability) {
      this.mutateOutputBias()
    }

    if (rng.gen() < this.genomeOptions.mutateOutputActivationProbability) {
      this.mutateOutputActivation()
    }
  }

  mutateHiddenBias(): void {
    const rng = threadRNG()
    const size = this.hiddenNodes.size
    if (size === 0) {
      return
    }
    const randomIndex = rng.genRange(0, size)
    let i = 0
    for (const node of this.hiddenNodes.values()) {
      if (i === randomIndex) {
        node.bias +=
          (rng.gen() - 0.5) * 2.0 * this.genomeOptions.mutateHiddenBiasSize
        break
      }
      i++
    }
  }

  mutateHiddenActivation(): void {
    const rng = threadRNG()
    const size = this.hiddenNodes.size
    if (size === 0) {
      return
    }
    const randomIndex = rng.genRange(0, size)
    let i = 0
    for (const node of this.hiddenNodes.values()) {
      if (i === randomIndex) {
        node.activation = this.genomeOptions.hiddenActivations[
          rng.genRange(0, this.genomeOptions.hiddenActivations.length)
        ] as Activation
        break
      }
      i++
    }
  }

  mutateOutputBias(): void {
    const rng = threadRNG()
    const size = this.outputs.size
    if (size === 0) {
      return
    }
    const randomIndex = rng.genRange(0, size)
    let i = 0
    for (const node of this.outputs.values()) {
      if (i === randomIndex) {
        node.bias +=
          (rng.gen() - 0.5) * 2.0 * this.genomeOptions.mutateOutputBiasSize
        break
      }
      i++
    }
  }

  mutateOutputActivation(): void {
    const rng = threadRNG()
    const size = this.outputs.size
    if (size === 0) {
      return
    }
    const randomIndex = rng.genRange(0, size)
    let i = 0
    for (const node of this.outputs.values()) {
      if (i === randomIndex) {
        node.activation = this.genomeOptions.outputActivations[
          rng.genRange(0, this.genomeOptions.outputActivations.length)
        ] as Activation
        break
      }
      i++
    }
  }

  getActivation(nodeKey: NodeKey): Activation {
    const type = nodeKeyToType(nodeKey)
    switch (type) {
      case NodeType.Input:
        return (this.inputs.get(nodeKey) as CPPNNode).activation
      case NodeType.Hidden:
        return (this.hiddenNodes.get(nodeKey) as CPPNNode).activation
      case NodeType.Output:
        return (this.outputs.get(nodeKey) as CPPNNode).activation
      default:
        throw new Error('Unknown node type')
    }
  }

  getBias(nodeKey: NodeKey): number {
    const type = nodeKeyToType(nodeKey)
    switch (type) {
      case NodeType.Input:
        return (this.inputs.get(nodeKey) as CPPNNode).bias
      case NodeType.Hidden:
        return (this.hiddenNodes.get(nodeKey) as CPPNNode).bias
      case NodeType.Output:
        return (this.outputs.get(nodeKey) as CPPNNode).bias
      default:
        throw new Error('Unknown node type')
    }
  }

  override toFactoryOptions(): CPPNGenomeFactoryOptions {
    const hiddenNodes: CPPNNodeData[] = []
    const outputs: CPPNNodeData[] = []
    const links: NEATLinkData[] = []

    for (const node of this.hiddenNodes.values()) {
      hiddenNodes.push([node.id, node.bias, node.activation])
    }
    for (const node of this.outputs.values()) {
      outputs.push([node.id, node.bias, node.activation])
    }
    for (const link of this.links.values()) {
      links.push([link.from, link.to, link.weight, link.innovation])
    }

    return {
      hiddenNodes,
      outputs,
      links,
    }
  }
}
