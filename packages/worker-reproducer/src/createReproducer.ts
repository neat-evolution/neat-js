import type { Genome } from '@neat-js/core'

import type { AnyPopulation } from './types.js'
import { WorkerReproducer } from './WorkerReproducer.js'
import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export const createReproducer = <
  G extends Genome<any, any, any, any, any, any, any, G>
>(
  population: AnyPopulation<G>,
  options: WorkerReproducerOptions
) => {
  return new WorkerReproducer<G>(population, options)
}
