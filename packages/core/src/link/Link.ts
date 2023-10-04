import type { LinkConfig } from '../config/ExtendedConfig.js'
import type { NodeKey } from '../node/nodeRefToKey.js'
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
  public readonly from: NodeKey
  public readonly to: NodeKey
  public weight: number
  public readonly innovation: number

  public readonly config: LC
  public readonly state: LS
  public readonly createLink: LinkFactory<LC, LS, L>

  constructor(
    from: NodeKey,
    to: NodeKey,
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
      this.from,
      this.to,
      this.weight,
      this.innovation,
      this.config,
      this.state
    )
  }

  crossover(other: L, _fitness: number, _otherFitness: number): L {
    if (
      this.from !== other.from ||
      this.to !== other.to ||
      this.innovation !== other.innovation
    ) {
      throw new Error('Mismatch in crossover')
    }

    return this.createLink(
      this.from,
      this.to,
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
    return toLinkKey(this.from, this.to)
  }

  toJSON(): LinkData<LC, LS> {
    return {
      from: this.from,
      to: this.to,
      weight: this.weight,
      innovation: this.innovation,
      // FIXME: this.config.toJSON()
      config: this.config,
      // FIXME: this.state.toJSON()
      state: this.state,
    }
  }

  toFactoryOptions(): LinkFactoryOptions {
    return [this.from, this.to, this.weight, this.innovation]
  }
}
