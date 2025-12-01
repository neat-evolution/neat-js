import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { NodeKey } from '../node/nodeRefToKey.js'
import type { InnovationKey } from '../state/hashInnovationKey.js'
import type { ExtendedState } from '../state/StateProvider.js'

import type { Link } from './Link.js'
import type { LinkData } from './LinkData.js'
import type { LinkFactory } from './LinkFactory.js'
import type { LinkFactoryOptions } from './LinkFactoryOptions.js'
import { toLinkKey } from './linkRefToKey.js'

export class CoreLink<
  LFO extends LinkFactoryOptions,
  LCO extends ConfigOptions,
  LSD,
  LS extends ExtendedState<LSD>,
  L extends CoreLink<LFO, LCO, LSD, LS, L>,
> implements Link<LFO, LCO, LSD, LS, L> {
  // LinkRef
  public readonly from: NodeKey
  public readonly to: NodeKey

  // Link
  public weight: number
  public readonly innovation: InnovationKey

  // LinkExtension
  public readonly config: LCO
  public readonly state: LS

  // LinkFactory
  public readonly createLink: LinkFactory<LFO, LCO, LSD, LS, L>

  constructor(
    factoryOptions: LFO,
    config: LCO,
    state: LS,
    createLink: LinkFactory<LFO, LCO, LSD, LS, L>
  ) {
    this.from = factoryOptions.from
    this.to = factoryOptions.to
    this.weight = factoryOptions.weight
    this.innovation = factoryOptions.innovation

    this.config = config
    this.state = state
    this.createLink = createLink
  }

  /**
   * Creates a new link; Only async in des-hyperneat
   * @param {LinkFactoryOptions} linkFactoryOptions core link factory options with no extensions
   * @returns {L | Promise<L>} a Link
   */
  public identity(linkFactoryOptions: LinkFactoryOptions): L | Promise<L> {
    return this.createLink(linkFactoryOptions, this.config, this.state)
  }

  public cloneWith(linkFactoryOptions: LinkFactoryOptions): L {
    return this.createLink(linkFactoryOptions, this.config, this.state)
  }

  public clone(): L {
    return this.createLink(this.toFactoryOptions(), this.config, this.state)
  }

  crossover(other: L, _fitness: number, _otherFitness: number): L {
    if (
      this.from !== other.from ||
      this.to !== other.to ||
      this.innovation !== other.innovation
    ) {
      throw new Error('Mismatch in crossover')
    }
    const factoryOptions = this.toFactoryOptions()
    factoryOptions.weight = (this.weight + other.weight) / 2
    return this.createLink(factoryOptions, this.config, this.state)
  }

  distance(other: L): number {
    return Math.tanh(Math.abs(this.weight - other.weight))
  }

  toString(): string {
    return toLinkKey(this.from, this.to)
  }

  /**
   * Must override
   * @returns {LinkData<LFO, LCO, LSD>} link data
   */
  toJSON(): LinkData<LFO, LCO, LSD> {
    return {
      config: this.config,
      state: this.state?.toJSON() ?? null,
      factoryOptions: this.toFactoryOptions(),
    } as unknown as LinkData<LFO, LCO, LSD>
  }

  /**
   * Must override
   * @returns {LFO} link factory options
   */
  toFactoryOptions(): LFO {
    return {
      from: this.from,
      to: this.to,
      weight: this.weight,
      innovation: this.innovation,
    } as unknown as LFO
  }
}
