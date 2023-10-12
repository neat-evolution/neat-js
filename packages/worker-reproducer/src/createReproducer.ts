import type { CoreGenome } from '@neat-js/core'

import type { AnyPopulation } from './types.js'
import { WorkerReproducer } from './WorkerReproducer.js'
import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export const createReproducer = <
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
    G
  >
>(
  population: AnyPopulation<G>,
  options: WorkerReproducerOptions
) => {
  return new WorkerReproducer<G>(population, options)
}
