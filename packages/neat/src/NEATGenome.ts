import {
  CoreGenome,
  type InitConfig,
  type LinkFactoryOptions,
  NodeType,
  toNodeKey,
} from '@neat-evolution/core'

import { createGenome } from './createGenome.js'
import { createLink } from './createLink.js'
import { createNode } from './createNode.js'
import type { NEATContext } from './NEATContext.js'
import type { NEATGenomeData } from './NEATGenomeData.js'
import type {
  NEATGenomeFactoryOptions,
  NEATHiddenNodeData,
  NEATLinkData,
} from './NEATGenomeFactoryOptions.js'
import type { NEATGenomeOptions } from './NEATGenomeOptions.js'

export class NEATGenome extends CoreGenome<NEATContext> {
  constructor(
    config: NEATContext['Config']['Type'],
    state: NEATContext['State']['Type'],
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

  protected override hydrate(factoryOptions: NEATGenomeFactoryOptions): void {
    const hiddenNodesData = factoryOptions.hiddenNodes
    for (let i = 0; i < hiddenNodesData.length; i++) {
      const id = hiddenNodesData[i]!
      const node = this.createNode(
        { type: NodeType.Hidden, id },
        this.config.node(),
        this.state.node()
      )
      this.hiddenNodes.set(toNodeKey(NodeType.Hidden, id), node)
    }

    const linksData = factoryOptions.links
    for (let i = 0; i < linksData.length; i++) {
      const [fromKey, toKey, weight, innovation] = linksData[i]!
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

  override init(factoryOptions?: NEATGenomeFactoryOptions): void {
    super.init(factoryOptions)
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
    const hiddenNodes: NEATHiddenNodeData[] = new Array(this.hiddenNodes.size)
    const links: NEATLinkData[] = new Array(this.links.size)

    let i = 0
    for (const node of this.hiddenNodes.values()) {
      hiddenNodes[i++] = node.id
    }

    i = 0
    for (const link of this.links.values()) {
      links[i++] = [link.from, link.to, link.weight, link.innovation]
    }

    return {
      hiddenNodes,
      links,
    }
  }
}
