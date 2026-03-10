import type { AnyErasedAlgorithm } from '@neat-evolution/evaluator'
import type { Evaluator } from '@neat-evolution/evaluator'

import type { Population } from './Population.js'
import type { ReproducerFactory } from './reproducer/ReproducerFactory.js'

export interface ErasedAlgorithmDefinition<
  C,
  P extends Population<any> = Population<any>,
> {
  algorithm: AnyErasedAlgorithm
  defaultGenomeOptions: unknown
  usesCPPNActivations: boolean
  createPopulation: (
    reproducer: ReproducerFactory<P>,
    evaluator: Evaluator<any>,
    config: C
  ) => P
}
