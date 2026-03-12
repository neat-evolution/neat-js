import type {
  AlgorithmContext,
  ConfigDataOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  LinkDataOf,
  NodeHiddenDataOf,
  StateDataOf,
} from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'

import type { Population } from './Population.js'
import type { PopulationFactoryOptions } from './PopulationFactoryOptions.js'
import type { PopulationOptions } from './PopulationOptions.js'
import type { ReproducerFactory } from './reproducer/ReproducerFactory.js'

/**
 * Interface for algorithms that can create populations directly.
 * Takes configData in the already-wrapped form (same type as Algorithm.createConfig).
 *
 * This is separate from the core Algorithm interface because it depends on
 * Population, Evaluator, and other types that would create circular dependencies
 * if placed in @neat-evolution/core.
 */
export interface PopulationCreator<Ctx extends AlgorithmContext> {
  createPopulation: (
    createReproducer: ReproducerFactory<Population<Ctx>>,
    evaluator: Evaluator,
    configData: ConfigDataOf<Ctx>,
    populationOptions: PopulationOptions,
    genomeOptions: GenomeOptionsOf<Ctx>,
    populationFactoryOptions?: PopulationFactoryOptions<
      ConfigDataOf<Ctx>,
      StateDataOf<Ctx>,
      NodeHiddenDataOf<Ctx>,
      LinkDataOf<Ctx>,
      GenomeFactoryOptionsOf<Ctx>,
      GenomeOptionsOf<Ctx>
    >
  ) => Population<Ctx>
}
