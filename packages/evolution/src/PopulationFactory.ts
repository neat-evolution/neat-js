import type {
  AlgorithmContext,
  ConfigDataOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  LinkDataOf,
  NEATConfigOptions,
  NodeHiddenDataOf,
  StateDataOf,
} from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'

import type { Population } from './Population.js'
import type { PopulationFactoryOptions } from './PopulationFactoryOptions.js'
import type { PopulationOptions } from './PopulationOptions.js'
import type { ReproducerFactory } from './reproducer/ReproducerFactory.js'

export type PopulationFactory<Ctx extends AlgorithmContext> = (
  createReproducer: ReproducerFactory<Population<Ctx>>,
  evaluator: Evaluator<any>,
  neatConfigOptions: NEATConfigOptions,
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
