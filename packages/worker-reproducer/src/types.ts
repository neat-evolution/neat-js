import type { CoreGenome } from '@neat-evolution/core'
import type { Population } from '@neat-evolution/evolution'

import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export interface RequestMapValue<V> {
  resolve: (value: V | PromiseLike<V>) => void
  reject: (reason?: any) => void
}

export type AnyPopulation<
  G extends CoreGenome<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    G
  >
> = Population<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  G,
  any,
  WorkerReproducerOptions
>
