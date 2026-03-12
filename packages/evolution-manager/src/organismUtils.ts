import type {
  Algorithm,
  AlgorithmContext,
  ConfigDataOf,
  ConfigFactoryOptionsOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  InitConfig,
  LinkDataOf,
  NodeHiddenDataOf,
  StateDataOf,
} from '@neat-evolution/core'
import { Organism, type OrganismData } from '@neat-evolution/evolution'
import type { SyncExecutor } from '@neat-evolution/executor'
import { createExecutor } from '@neat-evolution/executor'

/** Convert an organism to a sync executor for inference. */
export function organismToExecutor<Ctx extends AlgorithmContext>(
  algorithm: Algorithm<Ctx>,
  organism: Organism<Ctx>
): SyncExecutor {
  return createExecutor(algorithm.createPhenotype(organism.genome))
}

/** Deserialize an organism from previously saved OrganismData.
 *  Works without a running EvolutionManager — useful for CLI replay,
 *  game inference, or any context where you just need an organism
 *  from stored data.
 *
 *  @param algorithm - The algorithm that created the organism
 *  @param organismData - Serialized organism data (from Organism.toJSON())
 *  @param initConfig - Environment description (inputs/outputs)
 */
export function deserializeOrganism<Ctx extends AlgorithmContext>(
  algorithm: Algorithm<Ctx>,
  organismData: OrganismData<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    NodeHiddenDataOf<Ctx>,
    LinkDataOf<Ctx>,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  >,
  initConfig: InitConfig
): Organism<Ctx> {
  const configProvider = algorithm.createConfig(
    organismData.genome.config as ConfigFactoryOptionsOf<Ctx>
  )
  const stateProvider = algorithm.createState(organismData.genome.state)
  const genome = algorithm.createGenome(
    configProvider,
    stateProvider,
    organismData.genome.genomeOptions,
    initConfig,
    organismData.genome.factoryOptions
  )
  return new Organism<Ctx>(
    genome,
    organismData.organismState.generation,
    organismData.organismState
  )
}

/** Convenience: deserialize organism data directly to a SyncExecutor.
 *  Combines deserializeOrganism() + organismToExecutor() in one call.
 *
 *  @param algorithm - The algorithm that created the organism
 *  @param organismData - Serialized organism data (from Organism.toJSON())
 *  @param initConfig - Environment description (inputs/outputs)
 */
export function serializedToExecutor<Ctx extends AlgorithmContext>(
  algorithm: Algorithm<Ctx>,
  organismData: OrganismData<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    NodeHiddenDataOf<Ctx>,
    LinkDataOf<Ctx>,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  >,
  initConfig: InitConfig
): SyncExecutor {
  const organism = deserializeOrganism(algorithm, organismData, initConfig)
  return organismToExecutor(algorithm, organism)
}
