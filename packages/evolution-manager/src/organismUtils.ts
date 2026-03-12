import type { Algorithm, AlgorithmContext } from '@neat-evolution/core'
import type { Organism } from '@neat-evolution/evolution'
import type { SyncExecutor } from '@neat-evolution/executor'
import { createExecutor } from '@neat-evolution/executor'

/** Convert an organism to a sync executor for inference. */
export function organismToExecutor<Ctx extends AlgorithmContext>(
  algorithm: Algorithm<Ctx>,
  organism: Organism<Ctx>
): SyncExecutor {
  return createExecutor(algorithm.createPhenotype(organism.genome))
}
