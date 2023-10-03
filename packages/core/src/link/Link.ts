import type { LinkConfig } from '../config/ExtendedConfig.js'
import type { NodeRef } from '../node/NodeRef.js'
import { toNodeRef } from '../node/toNodeRef.js'
import type { LinkState } from '../state/ExtendedState.js'

import type { LinkData } from './LinkData.js'
import type { LinkExtension } from './LinkExtension.js'
import type { LinkFactory, LinkFactoryOptions } from './LinkFactory.js'
import { toLinkKey } from './linkRefToKey.js'
export class Link<
  LC extends LinkConfig,
  LS extends LinkState,
  L extends Link<LC, LS, L>
> implements LinkExtension<LC, LS, L>
{
  public readonly from: NodeRef
  public readonly to: NodeRef
  public weight: number
  public readonly innovation: number

  public readonly config: LC
  public readonly state: LS
  public readonly createLink: LinkFactory<LC, LS, L>

  constructor(
    from: NodeRef,
    to: NodeRef,
    weight: number,
    innovation: number,
    config: LC,
    state: LS,
    createLink: LinkFactory<LC, LS, L>
  ) {
    this.from = from
    this.to = to
    this.weight = weight
    this.innovation = innovation
    this.config = config
    this.state = state
    this.createLink = createLink
  }

  public neat(): LinkExtension<LC, LS, L> {
    return this
  }

  public identity(neat: L): L {
    return neat
  }

  public cloneWith(neat: L): L {
    return neat
  }

  public clone(): L {
    return this.createLink(
      toNodeRef(this.from),
      toNodeRef(this.to),
      this.weight,
      this.innovation,
      this.config,
      this.state
    )
  }

  crossover(other: L, _fitness: number, _otherFitness: number): L {
    if (
      this.from.type !== other.from.type ||
      this.from.id !== other.from.id ||
      this.to.type !== other.to.type ||
      this.to.id !== other.to.id ||
      this.innovation !== other.innovation
    ) {
      throw new Error('Mismatch in crossover')
    }

    return this.createLink(
      toNodeRef(this.from),
      toNodeRef(this.to),
      (this.weight + other.weight) / 2,
      this.innovation,
      this.config,
      this.state
    )
  }

  distance(other: L): number {
    return Math.tanh(Math.abs(this.weight - other.weight))
  }

  toString(): string {
    return toLinkKey(this.from.type, this.from.id, this.to.type, this.to.id)
  }

  toJSON(): LinkData<LC, LS> {
    return {
      from: toNodeRef(this.from),
      to: toNodeRef(this.to),
      weight: this.weight,
      innovation: this.innovation,
      // FIXME: this.config.toFactoryOptions()
      config: this.config,
      // FIXME: this.state.toFactoryOptions()
      state: this.state,
    }
  }

  toFactoryOptions(): LinkFactoryOptions<LC, LS> {
    return {
      from: toNodeRef(this.from),
      to: toNodeRef(this.to),
      weight: this.weight,
      innovation: this.innovation,
    }
  }
}
