import type { Population, ReproducerFactory } from '@neat-evolution/evolution'
import { WorkerReproducer } from './WorkerReproducer.js'
import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export interface Terminable {
  terminate: () => Promise<void>
}

export const createReproducerFactory = <P extends Population<any>>(
  options: WorkerReproducerOptions,
  terminables: Set<Terminable>
): ReproducerFactory<P> => {
  return (population: P) => {
    const reproducer = new WorkerReproducer(population, options)
    terminables.add(reproducer)
    return reproducer
  }
}
