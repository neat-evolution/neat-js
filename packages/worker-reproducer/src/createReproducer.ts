import {
  createReproducerFactory,
  type Terminable,
} from './createReproducerFactory.js'
import { defaultWorkerReproducerOptions } from './WorkerReproducerOptions.js'

export const terminables = new Set<Terminable>()

export const createReproducer = createReproducerFactory(
  defaultWorkerReproducerOptions,
  terminables
)
