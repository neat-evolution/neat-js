import type { LinkConfig } from '../config/ExtendedConfig.js'
import { toNodeKey, type NodeRef } from '../node/Node.js'
import type { LinkState } from '../state/ExtendedState.js'

import type { LinkFactory } from './LinkFactory.js'

export interface LinkRef {
  from: NodeRef
  to: NodeRef
  weight: number
  innovation: number
  toJSON?: () => Omit<LinkRef, 'toJSON'>
}

export interface LinkData<C extends LinkConfig, S extends LinkState>
  extends Omit<LinkRef, 'toJSON'> {
  config: C
  state: S
}

export interface LinkExtension<
  C extends LinkConfig,
  S extends LinkState,
  L extends LinkExtension<C, S, L>
> extends LinkRef {
  config: C
  state: S
  createLink: LinkFactory<C, S, L>
  neat: () => L
  identity: (neat: L) => L
  cloneWith: (neat: L) => L
  crossover: (other: L, fitness: number, otherFitness: number) => L
  distance: (other: L) => number
}

export class Link<C extends LinkConfig, S extends LinkState>
  implements LinkExtension<C, S, Link<C, S>>
{
  public readonly from: NodeRef
  public readonly to: NodeRef
  public readonly weight: number
  public readonly innovation: number

  public readonly config: C
  public readonly state: S
  public readonly createLink: LinkFactory<C, S, Link<C, S>>

  constructor(
    from: NodeRef,
    to: NodeRef,
    weight: number,
    innovation: number,
    config: C,
    state: S,
    createLink: LinkFactory<C, S, Link<C, S>>
  ) {
    this.from = from
    this.to = to
    this.weight = weight
    this.innovation = innovation
    this.config = config
    this.state = state
    this.createLink = createLink
  }

  public neat(): this {
    return this
  }

  public identity(neat: Link<C, S>): Link<C, S> {
    return neat
  }

  public cloneWith(neat: Link<C, S>): Link<C, S> {
    return neat
  }

  crossover(
    other: Link<C, S>,
    _fitness: number,
    _otherFitness: number
  ): Link<C, S> {
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
      this.from,
      this.to,
      (this.weight + other.weight) / 2,
      this.innovation,
      this.config,
      this.state
    )
  }

  distance(other: Link<C, S>): number {
    return Math.tanh(Math.abs(this.weight - other.weight))
  }

  toString(): string {
    return toLinkKey(this.from.type, this.from.id, this.to.type, this.to.id)
  }

  toJSON(): LinkData<C, S> {
    return {
      from: this.from,
      to: this.to,
      weight: this.weight,
      innovation: this.innovation,
      config: this.config,
      state: this.state,
    }
  }
}

export const linkRefToKey = (linkRef: LinkRef): string => {
  return toLinkKey(
    linkRef.from.type,
    linkRef.from.id,
    linkRef.to.type,
    linkRef.to.id
  )
}

export const nodeRefsToLinkKey = (from: NodeRef, to: NodeRef): string => {
  return toLinkKey(from.type, from.id, to.type, to.id)
}

export const toLinkKey = (
  fromType: NodeRef['type'],
  fromId: NodeRef['id'],
  toType: NodeRef['type'],
  toId: NodeRef['id']
): string => {
  return `${toNodeKey(fromType, fromId)} -> ${toNodeKey(toType, toId)}`
}
