import type { ConfigOptions } from '../config/ConfigOptions.js'
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
  L extends Link<LFO, LCO, LSD, LS, L>
> extends LinkRef {
  // Link
  weight: number
  readonly innovation: number

  // LinkExtension
  readonly config: LCO
  readonly state: LS

  // LinkFactory
  createLink: LinkFactory<LFO, LCO, LSD, LS, L>

  /**
   * @deprecated remove in favor of inheritance; only useful in des-hyperneat
   */
  neat: () => Link<LFO, LCO, LSD, LS, L>

  /** only useful in des-hyperneat */
  identity: (neat: L) => L

  /** only useful in des-hyperneat */
  cloneWith: (neat: L) => L

  clone: () => L

  crossover: (other: L, fitness: number, otherFitness: number) => L
  distance: (other: L) => number

  toJSON: () => LinkData<LFO, LCO, LSD>
  toFactoryOptions: () => LFO
}
