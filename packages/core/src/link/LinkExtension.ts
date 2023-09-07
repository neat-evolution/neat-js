import type { LinkConfig } from '../config/ExtendedConfig.js'
import type { LinkData, LinkRef } from '../link/LinkData.js'
import type { LinkFactory, LinkFactoryOptions } from '../link/LinkFactory.js'
import type { LinkState } from '../state/ExtendedState.js'

export interface LinkExtension<
  LC extends LinkConfig,
  LS extends LinkState,
  L extends LinkExtension<LC, LS, L>
> extends LinkRef {
  weight: number
  readonly innovation: number

  readonly config: LC
  readonly state: LS

  createLink: LinkFactory<LC, LS, L>

  /** only useful in des-hyperneat */
  neat: () => LinkExtension<LC, LS, L>

  /** only useful in des-hyperneat */
  identity: (neat: L) => L

  /** only useful in des-hyperneat */
  cloneWith: (neat: L) => L

  clone: () => L

  crossover: (other: L, fitness: number, otherFitness: number) => L
  distance: (other: L) => number

  toJSON: () => LinkData<LC, LS>
  toFactoryOptions: () => LinkFactoryOptions<LC, LS>
}
