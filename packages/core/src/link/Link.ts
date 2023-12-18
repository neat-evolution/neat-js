import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { InnovationKey } from '../state/hashInnovationKey.js'
import type { ExtendedState } from '../state/StateProvider.js'

import type { LinkData } from './LinkData.js'
import type { LinkFactory } from './LinkFactory.js'
import type { LinkFactoryOptions } from './LinkFactoryOptions.js'
import type { LinkRef } from './LinkRef.js'

export interface Link<
  LFO extends LinkFactoryOptions,
  LCO extends ConfigOptions,
  LSD,
  LS extends ExtendedState<LSD>,
  L extends Link<LFO, LCO, LSD, LS, L>,
> extends LinkRef {
  // Link
  weight: number
  readonly innovation: InnovationKey

  // LinkExtension
  readonly config: LCO
  readonly state: LS

  // LinkFactory
  createLink: LinkFactory<LFO, LCO, LSD, LS, L>

  /**
   * Creates an algorithm link from the core link factory options
   * @param {LinkFactoryOptions} linkFactoryOptions core link factory options with no extensions
   * @returns a link for this algorithm
   */
  identity: (linkFactoryOptions: LinkFactoryOptions) => L | Promise<L>

  /**
   * Clones an algorithm link from the core link factory options
   * @param linkFactoryOptions core link factory options with no extensions
   * @returns a link for this algorithm
   */
  cloneWith: (linkFactoryOptions: LinkFactoryOptions) => L

  clone: () => L

  crossover: (other: L, fitness: number, otherFitness: number) => L
  distance: (other: L) => number

  toJSON: () => LinkData<LFO, LCO, LSD>
  toFactoryOptions: () => LFO
}
