import type { RNG } from '@neat-evolution/utils'
import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type {
  ConfigLinkOptionsOf,
  LinkFactoryOptionsOf,
  LinkTypeOf,
  StateLinkDataOf,
  StateLinkOf,
} from '../contexts/helpers.js'
import type { InnovationKey } from '../state/hashInnovationKey.js'

import type { LinkData } from './LinkData.js'
import type { LinkFactory } from './LinkFactory.js'
import type { LinkFactoryOptions } from './LinkFactoryOptions.js'
import type { LinkRef } from './LinkRef.js'

export interface Link<Ctx extends AlgorithmContext> extends LinkRef {
  // Link
  weight: number
  innovation: InnovationKey

  // LinkExtension
  readonly config: ConfigLinkOptionsOf<Ctx>
  readonly state: StateLinkOf<Ctx>

  // LinkFactory
  createLink: LinkFactory<Ctx>

  /**
   * Creates an algorithm link from the core link factory options
   * @param {LinkFactoryOptions} linkFactoryOptions core link factory options with no extensions
   * @returns a link for this algorithm
   */
  identity: (
    linkFactoryOptions: LinkFactoryOptions
  ) => LinkTypeOf<Ctx> | Promise<LinkTypeOf<Ctx>>

  /**
   * Clones an algorithm link from the core link factory options
   * @param linkFactoryOptions core link factory options with no extensions
   * @returns a link for this algorithm
   */
  cloneWith: (linkFactoryOptions: LinkFactoryOptions) => LinkTypeOf<Ctx>

  clone: () => LinkTypeOf<Ctx>

  crossover: (
    other: LinkTypeOf<Ctx>,
    fitness: number,
    otherFitness: number,
    rng: RNG
  ) => LinkTypeOf<Ctx>
  distance: (other: LinkTypeOf<Ctx>) => number

  toJSON: () => LinkData<
    LinkFactoryOptionsOf<Ctx>,
    ConfigLinkOptionsOf<Ctx>,
    StateLinkDataOf<Ctx>
  >
  toFactoryOptions: () => LinkFactoryOptionsOf<Ctx>

  /** Return this link to an object pool for reuse. No-op if pooling is not supported. */
  release: () => void
}
