import {
  CoreNode,
  type NEATConfigOptions,
  type NodeFactory,
  NodeType,
  toLinkKey,
  toNodeKey,
} from '@neat-evolution/core'
import {
  CPPNAlgorithm,
  type CPPNGenome,
  type CPPNGenomeOptions,
} from '@neat-evolution/cppn'
import type { RNG } from '@neat-evolution/utils'

import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import {
  type DESHyperNEATNodeFactoryOptions,
  isCPPNGenome,
} from './DESHyperNEATNodeFactoryOptions.js'

export class DESHyperNEATNode extends CoreNode<DESHyperNEATContext> {
  options: DESHyperNEATGenomeOptions
  cppn: CPPNGenome<CPPNGenomeOptions>
  depth: number

  constructor(
    options: DESHyperNEATGenomeOptions,
    factoryOptions: DESHyperNEATNodeFactoryOptions,
    config: NEATConfigOptions,
    state: DESHyperNEATContext['State']['Node'],
    createNode: NodeFactory<DESHyperNEATContext>
  ) {
    super(factoryOptions, config, state, createNode)
    this.options = options

    const nodeKey = toNodeKey(this.type, this.id)
    const linkKey = toLinkKey(nodeKey, nodeKey)

    let cppn: CPPNGenome<CPPNGenomeOptions>
    if (factoryOptions.cppn != null && isCPPNGenome(factoryOptions.cppn)) {
      cppn = factoryOptions.cppn
      state.setState(linkKey, cppn.state)
    } else {
      cppn = CPPNAlgorithm.createGenome(
        CPPNAlgorithm.createConfig({ neat: config }),
        state.getOrCreateState(linkKey, this.options.singleCPPNState),
        this.options,
        { inputs: 4, outputs: 2 },
        factoryOptions.cppn
      )
    }

    const maxSubstrateDepth =
      this.type === NodeType.Input
        ? this.options.maxInputSubstrateDepth
        : this.type === NodeType.Output
          ? this.options.maxOutputSubstrateDepth
          : this.options.maxHiddenSubstrateDepth
    const depth =
      factoryOptions.depth ?? Math.max(Math.min(1, maxSubstrateDepth), 0)

    this.cppn = cppn
    this.depth = depth
  }

  override crossover(
    other: DESHyperNEATNode,
    fitness: number,
    otherFitness: number,
    rng: RNG
  ): DESHyperNEATNode {
    if (this.type !== other.type || this.id !== other.id) {
      throw new Error('Mismatch in crossover')
    }
    const factoryOptions = {
      ...super.toFactoryOptions(),
      cppn: this.cppn.crossover(other.cppn, fitness, otherFitness, rng),
      depth: rng.genBool() ? this.depth : other.depth,
    }
    return this.createNode(factoryOptions, this.config, this.state)
  }

  override distance(other: DESHyperNEATNode): number {
    let distance = super.distance(other)
    distance += 0.8 * this.cppn.distance(other.cppn)
    distance += 0.2 * Math.tanh(Math.abs(this.depth - other.depth))
    return distance
  }

  override toFactoryOptions(): DESHyperNEATNodeFactoryOptions {
    return {
      ...super.toFactoryOptions(),
      cppn: this.cppn.toFactoryOptions(),
      depth: this.depth,
    }
  }
}
