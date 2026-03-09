import type { Reproducer } from './Reproducer.js'

export type ReproducerFactory<P> = (population: P) => Reproducer
