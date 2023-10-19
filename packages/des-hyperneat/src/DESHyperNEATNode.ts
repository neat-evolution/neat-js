import {
  CoreNode,
  NodeType,
  type NEATConfigOptions,
  type NodeFactory,
  toNodeKey,
  toLinkKey,
} from '@neat-js/core'
import {
  CPPNAlgorithm,
  type CPPNGenome,
  type CPPNGenomeOptions,
} from '@neat-js/cppn'
import { type NEATState } from '@neat-js/neat'
import { threadRNG } from '@neat-js/utils'

import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import {
  isCPPNGenome,
  type DESHyperNEATNodeFactoryOptions,
} from './DESHyperNEATNodeFactoryOptions.js'

export class DESHyperNEATNode extends CoreNode<
  DESHyperNEATNodeFactoryOptions,
  NEATConfigOptions,
  CustomStateData,
  CustomState,
  DESHyperNEATNode
> {
  options: DESHyperNEATGenomeOptions
  cppn: CPPNGenome<CPPNGenomeOptions>
  depth: number

  constructor(
    options: DESHyperNEATGenomeOptions,
    factoryOptions: DESHyperNEATNodeFactoryOptions,
    config: NEATConfigOptions,
    state: CustomState,
    createNode: NodeFactory<
      DESHyperNEATNodeFactoryOptions,
      NEATConfigOptions,
      CustomStateData,
      CustomState,
      DESHyperNEATNode
    >
  ) {
    super(factoryOptions, config, state, createNode)
    this.options = options

    const cppnConfigProvider = CPPNAlgorithm.createConfig({ neat: config })
    const cppnInitConfig = { inputs: 4, outputs: 2 }

    const nodeKey = toNodeKey(factoryOptions.type, factoryOptions.id)
    const linkKey = toLinkKey(nodeKey, nodeKey)

    let cppn: CPPNGenome<CPPNGenomeOptions>
    if (factoryOptions.cppn != null && isCPPNGenome(factoryOptions.cppn)) {
      cppn = factoryOptions.cppn
    } else if (this.options.singleCPPNState) {
      cppn = CPPNAlgorithm.createGenome(
        cppnConfigProvider,
        state.singleCPPNState,
        this.options,
        cppnInitConfig,
        factoryOptions.cppn
      )
    } else if (state.uniqueCPPNStates.has(linkKey)) {
      const cppnState = state.uniqueCPPNStates.get(linkKey) as NEATState
      cppn = CPPNAlgorithm.createGenome(
        cppnConfigProvider,
        cppnState,
        this.options,
        cppnInitConfig,
        factoryOptions.cppn
      )
    } else {
      const cppnState = CPPNAlgorithm.createState()
      cppn = CPPNAlgorithm.createGenome(
        cppnConfigProvider,
        cppnState,
        this.options,
        cppnInitConfig,
        factoryOptions.cppn
      )
      state.uniqueCPPNStates.set(linkKey, cppnState)
    }

    const maxSubstrateDepth =
      this.type === NodeType.Input
        ? this.options.maxInputSubstrateDepth
        : this.type === NodeType.Output
        ? this.options.maxOutputSubstrateDepth
        : this.options.maxHiddenSubstrateDepth
    const depth = Math.max(0, Math.min(1, maxSubstrateDepth))

    this.cppn = cppn
    this.depth = depth
  }

  override crossover(
    other: DESHyperNEATNode,
    fitness: number,
    otherFitness: number
  ): DESHyperNEATNode {
    if (this.type !== other.type || this.id !== other.id) {
      throw new Error('Mismatch in crossover')
    }
    const rng = threadRNG()
    const factoryOptions = {
      ...super.toFactoryOptions(),
      cppn: this.cppn.crossover(other.cppn, fitness, otherFitness),
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
