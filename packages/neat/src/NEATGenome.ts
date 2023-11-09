import {
  CoreGenome,
  NodeType,
  type InitConfig,
  type LinkFactoryOptions,
  type NodeFactoryOptions,
  type StateData,
  nodeRefToKey,
  type ConfigFactoryOptions,
  type ConfigData,
} from '@neat-evolution/core'

import { createGenome } from './createGenome.js'
import { createLink } from './createLink.js'
import { createNode } from './createNode.js'
import type { NEATConfig } from './NEATConfig.js'
import type { NEATGenomeData } from './NEATGenomeData.js'
import type {
  NEATGenomeFactoryOptions,
  NEATHiddenNodeData,
  NEATLinkData,
} from './NEATGenomeFactoryOptions.js'
import type { NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'

export class NEATGenome extends CoreGenome<
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
  NEATHiddenNodeData,
  NEATLinkData,
  NEATGenomeFactoryOptions,
  NEATGenomeOptions,
  NEATGenomeData,
  NodeFactoryOptions,
  NEATNode,
  LinkFactoryOptions,
  NEATLink,
  NEATGenome
> {
  constructor(
    config: NEATConfig,
    state: NEATState,
    options: NEATGenomeOptions,
    initConfig: InitConfig,
    factoryOptions?: NEATGenomeFactoryOptions
  ) {
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

  override init(factoryOptions?: NEATGenomeFactoryOptions): void {
    super.init(factoryOptions)
    if (factoryOptions != null) {
      for (const id of factoryOptions.hiddenNodes) {
        const node = this.createNode(
          { type: NodeType.Hidden, id },
          this.config.node(),
          this.state.node()
        )
        this.hiddenNodes.set(nodeRefToKey(node), node)
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
    }
  }

  override toJSON(): NEATGenomeData {
    return {
      config: this.config.toJSON(),
      state: this.state.toJSON(),
      genomeOptions: this.genomeOptions,
      factoryOptions: this.toFactoryOptions(),
    }
  }

  override toFactoryOptions(): NEATGenomeFactoryOptions {
    const hiddenNodes: NEATHiddenNodeData[] = []
    const links: NEATLinkData[] = []

    for (const node of this.hiddenNodes.values()) {
      hiddenNodes.push(node.id)
    }

    for (const link of this.links.values()) {
      links.push([link.from, link.to, link.weight, link.innovation])
    }

    return {
      hiddenNodes,
      links,
    }
  }
}
