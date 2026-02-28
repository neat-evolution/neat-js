import type { Population } from '../Population.js'

import type { Reproducer } from './Reproducer.js'

export type ReproducerFactory<
  P extends Population<any>,
> = (population: P) => Reproducer
