import {
  CoreLink,
  toLinkKey,
  type InitConfig,
  type LinkFactory,
  type NEATConfigOptions,
} from '@neat-js/core'
import {
  CPPNAlgorithm,
  type CPPNGenome,
  type CPPNGenomeOptions,
} from '@neat-js/cppn'
import { identityGenome } from '@neat-js/es-hyperneat'
import { threadRNG } from '@neat-js/utils'

import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import type { DESHyperNEATLinkFactoryOptions } from './DESHyperNEATLinkFactoryOptions.js'
import { isCPPNGenome } from './DESHyperNEATNodeFactoryOptions.js'

export class DESHyperNEATLink extends CoreLink<
  DESHyperNEATLinkFactoryOptions,
  NEATConfigOptions,
  CustomStateData,
  CustomState,
  DESHyperNEATLink
> {
  options: DESHyperNEATGenomeOptions
  cppn: CPPNGenome<CPPNGenomeOptions>
  depth: number

  constructor(
    options: DESHyperNEATGenomeOptions,
    factoryOptions: DESHyperNEATLinkFactoryOptions,
    config: NEATConfigOptions,
    state: CustomState,
    createLink: LinkFactory<
      DESHyperNEATLinkFactoryOptions,
      NEATConfigOptions,
      CustomStateData,
      CustomState,
      DESHyperNEATLink
    >
  ) {
    super(factoryOptions, config, state, createLink)
    this.options = options

    let cppn: CPPNGenome<CPPNGenomeOptions>

    const key = toLinkKey(this.from, this.to)

    if (factoryOptions.cppn != null && isCPPNGenome(factoryOptions.cppn)) {
      cppn = factoryOptions.cppn
      if (!state.uniqueCPPNStates.has(key)) {
        state.uniqueCPPNStates.set(key, cppn.state)
      }
    } else {
      const cppnConfig = CPPNAlgorithm.createConfig({ neat: this.config })
      const cppnState =
        state.uniqueCPPNStates.get(key) ?? CPPNAlgorithm.createState()
      const cppnInitConfig: InitConfig = { inputs: 4, outputs: 2 }

      cppn = CPPNAlgorithm.createGenome(
        cppnConfig,
        cppnState,
        options,
        cppnInitConfig,
        factoryOptions.cppn
      )

      if (!state.uniqueCPPNStates.has(key)) {
        state.uniqueCPPNStates.set(key, cppnState)
      }
    }

    this.cppn = cppn
    this.depth = factoryOptions.depth ?? 1
  }

  override identity(neat: DESHyperNEATLink): DESHyperNEATLink {
    const [cppn, cppnState] = this.options.enableIdentityMapping
      ? identityGenome(this.config, this.options)
      : (() => {
          const cppnConfig = CPPNAlgorithm.createConfig({ neat: this.config })
          const cppnState = CPPNAlgorithm.createState()
          const cppnInitConfig: InitConfig = { inputs: 4, outputs: 2 }
          const cppn = CPPNAlgorithm.createGenome(
            cppnConfig,
            cppnState,
            this.options,
            cppnInitConfig
          )
          return [cppn, cppnState]
        })()

    const key = toLinkKey(neat.from, neat.to)
    if (!this.state.uniqueCPPNStates.has(key)) {
      this.state.uniqueCPPNStates.set(key, cppnState)
    }
    return this.createLink(
      {
        ...neat.toFactoryOptions(),
        cppn,
        depth: 1,
      },
      this.config,
      this.state
    )
  }

  override cloneWith(neat: DESHyperNEATLink): DESHyperNEATLink {
    const key = toLinkKey(neat.from, neat.to)
    if (!this.state.cppnStateRedirects.has(key)) {
      const oldKey = toLinkKey(neat.from, neat.to)
      this.state.cppnStateRedirects.set(
        key,
        this.state.cppnStateRedirects.get(oldKey) ?? oldKey
      )
    }
    return this.createLink(neat.toFactoryOptions(), this.config, this.state)
  }

  override crossover(
    other: DESHyperNEATLink,
    fitness: number,
    otherFitness: number
  ): DESHyperNEATLink {
    if (
      this.from !== other.from ||
      this.to !== other.to ||
      this.innovation !== other.innovation
    ) {
      throw new Error('Mismatch in crossover')
    }

    const rng = threadRNG()

    return this.createLink(
      {
        ...super.toFactoryOptions(),
        weight: (this.weight + other.weight) / 2,
        cppn: this.cppn.crossover(other.cppn, fitness, otherFitness),
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
