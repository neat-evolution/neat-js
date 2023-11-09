import type { CoreGenome } from '@neat-evolution/core'

import type { Population } from '../Population.js'

import type { Reproducer } from './Reproducer.js'
import type { ReproducerFactoryOptions } from './ReproducerFactoryOptions.js'

export type ReproducerFactory<
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
  P extends Population<
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
    RFO
  >,
  RFO extends ReproducerFactoryOptions
> = (population: P, reproducerFactoryOptions: RFO) => Reproducer<G>
