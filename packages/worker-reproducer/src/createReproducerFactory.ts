import type { CoreGenome } from '@neat-evolution/core'
import type { ReproducerFactory } from '@neat-evolution/evolution'

import type { AnyPopulation } from './types.js'
import { WorkerReproducer } from './WorkerReproducer.js'
import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export interface Terminable {
  terminate: () => Promise<void>
}

export const createReproducerFactory = <
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
  >,
>(
  options: WorkerReproducerOptions,
  terminables: Set<Terminable>
): ReproducerFactory<G, AnyPopulation<G>> => {
  return (population) => {
    const reproducer = new WorkerReproducer<G>(population, options)
    terminables.add(reproducer)
    return reproducer
  }
}
