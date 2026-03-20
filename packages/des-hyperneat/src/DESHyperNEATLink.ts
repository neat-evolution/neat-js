import {
  CoreLink,
  type LinkFactory,
  type LinkFactoryOptions,
  type NEATConfigOptions,
  toLinkKey,
} from '@neat-evolution/core'
import {
  CPPNAlgorithm,
  type CPPNGenome,
  type CPPNGenomeOptions,
} from '@neat-evolution/cppn'
import type { RNG } from '@neat-evolution/utils'

import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import type { DESHyperNEATLinkFactoryOptions } from './DESHyperNEATLinkFactoryOptions.js'
import { isCPPNGenome } from './DESHyperNEATNodeFactoryOptions.js'
import { insertIdentity } from './genome/insertIdentity.js'

export class DESHyperNEATLink extends CoreLink<DESHyperNEATContext> {
  options: DESHyperNEATGenomeOptions
  cppn: CPPNGenome<CPPNGenomeOptions>
  depth: number

  constructor(
    options: DESHyperNEATGenomeOptions,
    factoryOptions: DESHyperNEATLinkFactoryOptions,
    config: NEATConfigOptions,
    state: DESHyperNEATContext['State']['Link'],
    createLink: LinkFactory<DESHyperNEATContext>
  ) {
    super(factoryOptions, config, state, createLink)
    this.options = options

    let cppn: CPPNGenome<CPPNGenomeOptions>

    const linkKey = toLinkKey(this.from, this.to)

    if (factoryOptions.cppn != null && isCPPNGenome(factoryOptions.cppn)) {
      cppn = factoryOptions.cppn
      state.setState(linkKey, cppn.state)
    } else {
      cppn = CPPNAlgorithm.createGenome(
        CPPNAlgorithm.createConfig({ neat: this.config }),
        state.getOrCreateState(linkKey, this.options.singleCPPNState),
        options,
        { inputs: 4, outputs: 2 },
        factoryOptions.cppn
      )
    }

    this.cppn = cppn
    this.depth = factoryOptions.depth ?? 1
  }

  override async identity(
    linkFactoryOptions: LinkFactoryOptions
  ): Promise<DESHyperNEATLink> {
    // create a new link with a new cppn
    const link = this.createLink(linkFactoryOptions, this.config, this.state)

    // initialize the new cppn with the identity function
    if (this.options.enableIdentityMapping) {
      await insertIdentity(link.cppn, 0)
    }
    return link
  }

  override cloneWith(linkFactoryOptions: LinkFactoryOptions): DESHyperNEATLink {
    // create a new link with a cloned cppn and depth
    const cppn = this.cppn.clone()

    // ensure the new link always references the original state
    const key = toLinkKey(linkFactoryOptions.from, linkFactoryOptions.to)
    const oldKey = toLinkKey(this.from, this.to)
    this.state.cloneState(key, oldKey)

    // the cloned cppn will have a reference to the original cppn state
    const link = this.createLink(
      {
        ...linkFactoryOptions,
        cppn,
        depth: this.depth,
      },
      this.config,
      this.state
    )

    return link
  }

  override crossover(
    other: DESHyperNEATLink,
    fitness: number,
    otherFitness: number,
    rng?: RNG
  ): DESHyperNEATLink {
    if (
      this.from !== other.from ||
      this.to !== other.to ||
      this.innovation !== other.innovation
    ) {
      throw new Error('Mismatch in crossover')
    }
    if (rng == null) {
      throw new Error('DESHyperNEATLink.crossover requires rng')
    }

    return this.createLink(
      {
        ...super.toFactoryOptions(),
        weight: (this.weight + other.weight) / 2,
        cppn: this.cppn.crossover(other.cppn, fitness, otherFitness, rng),
        depth: rng.genBool() ? this.depth : other.depth,
      },
      this.config,
      this.state
    )
  }

  override distance(other: DESHyperNEATLink): number {
    let distance = 0.5 * super.distance(other)
    distance += 0.4 * this.cppn.distance(other.cppn)
    distance += 0.1 * Math.tanh(Math.abs(this.depth - other.depth))
    return distance
  }

  override toFactoryOptions(): DESHyperNEATLinkFactoryOptions {
    return {
      ...super.toFactoryOptions(),
      cppn: this.cppn.toFactoryOptions(),
      depth: this.depth,
    }
  }
}
