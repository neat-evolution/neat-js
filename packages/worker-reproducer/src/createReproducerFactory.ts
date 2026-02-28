import type { ReproducerFactory } from '@neat-evolution/evolution'

import type { AnyPopulation } from './types.js'
import { WorkerReproducer } from './WorkerReproducer.js'
import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export interface Terminable {
  terminate: () => Promise<void>
}

export const createReproducerFactory = (
  options: WorkerReproducerOptions,
  terminables: Set<Terminable>
): ReproducerFactory<AnyPopulation> => {
  return (population: AnyPopulation) => {
    const reproducer = new WorkerReproducer(population, options)
    terminables.add(reproducer)
    return reproducer
  }
}
