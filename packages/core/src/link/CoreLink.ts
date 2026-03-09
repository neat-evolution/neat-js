import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type {
  ConfigLinkOptionsOf,
  LinkFactoryOptionsOf,
  LinkTypeOf,
  StateLinkDataOf,
  StateLinkOf,
} from '../contexts/helpers.js'
import type { NodeKey } from '../node/nodeRefToKey.js'
import type { InnovationKey } from '../state/hashInnovationKey.js'

import type { Link } from './Link.js'
import type { LinkData } from './LinkData.js'
import type { LinkFactory } from './LinkFactory.js'
import type { LinkFactoryOptions } from './LinkFactoryOptions.js'
import { toLinkKey } from './linkRefToKey.js'

export class CoreLink<Ctx extends AlgorithmContext> implements Link<Ctx> {
  // LinkRef
  public readonly from: NodeKey
  public readonly to: NodeKey

  // Link
  public weight: number
  public readonly innovation: InnovationKey

  // LinkExtension
  public readonly config: ConfigLinkOptionsOf<Ctx>
  public readonly state: StateLinkOf<Ctx>

  // LinkFactory
  public readonly createLink: LinkFactory<Ctx>

  constructor(
    factoryOptions: LinkFactoryOptionsOf<Ctx>,
    config: ConfigLinkOptionsOf<Ctx>,
    state: StateLinkOf<Ctx>,
    createLink: LinkFactory<Ctx>
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
   * @returns a Link
   */
  public identity(
    linkFactoryOptions: LinkFactoryOptions
  ): LinkTypeOf<Ctx> | Promise<LinkTypeOf<Ctx>> {
    return this.createLink(linkFactoryOptions, this.config, this.state)
  }

  public cloneWith(linkFactoryOptions: LinkFactoryOptions): LinkTypeOf<Ctx> {
    return this.createLink(linkFactoryOptions, this.config, this.state)
  }

  public clone(): LinkTypeOf<Ctx> {
    return this.createLink(this.toFactoryOptions(), this.config, this.state)
  }

  crossover(
    other: LinkTypeOf<Ctx>,
    _fitness: number,
    _otherFitness: number
  ): LinkTypeOf<Ctx> {
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

  distance(other: LinkTypeOf<Ctx>): number {
    return Math.tanh(Math.abs(this.weight - other.weight))
  }

  toString(): string {
    return String(toLinkKey(this.from, this.to))
  }

  /**
   * Must override
   * @returns link data
   */
  toJSON(): LinkData<
    LinkFactoryOptionsOf<Ctx>,
    ConfigLinkOptionsOf<Ctx>,
    StateLinkDataOf<Ctx>
  > {
    return {
      config: this.config,
      state: this.state?.toJSON() ?? null,
      factoryOptions: this.toFactoryOptions(),
    } as LinkData<
      LinkFactoryOptionsOf<Ctx>,
      ConfigLinkOptionsOf<Ctx>,
      StateLinkDataOf<Ctx>
    >
  }

  /**
   * Must override
   * @returns link factory options
   */
  toFactoryOptions(): LinkFactoryOptionsOf<Ctx> {
    return {
      from: this.from,
      to: this.to,
      weight: this.weight,
      innovation: this.innovation,
    } as LinkFactoryOptionsOf<Ctx>
  }
}
