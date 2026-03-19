import type { ConfigFactory } from './config/ConfigFactory.js'
import type { AlgorithmContext } from './contexts/AlgorithmContext.js'
import type { GenomeOptionsOf, GenomeTypeOf } from './contexts/helpers.js'
import type { GenomeFactory } from './genome/GenomeFactory.js'
import type { PhenotypeFactory } from './phenotype/PhenotypeFactory.js'
import type { StateFactory } from './state/StateFactory.js'
import type { WritebackPayload } from './WritebackPayload.js'

export interface Algorithm<Ctx extends AlgorithmContext> {
  name: string
  pathname: string
  defaultOptions: GenomeOptionsOf<Ctx>
  createConfig: ConfigFactory<Ctx>
  createGenome: GenomeFactory<Ctx>
  createPhenotype: PhenotypeFactory<GenomeTypeOf<Ctx>, Ctx>
  createState: StateFactory<Ctx>

  /** Whether this algorithm uses CPPN activation arrays (vs single activation function).
   *  NEAT: false. CPPN/HyperNEAT/ES-HyperNEAT/DES-HyperNEAT: true. */
  usesCPPNActivations: boolean

  /** Whether worker-reproducer needs custom state for this algorithm.
   *  Only DES-HyperNEAT: true. All others: false. */
  enableCustomState: boolean

  /**
   * Write trained phenotype weights and biases back to the genome
   * (Lamarckian writeback). Called after training to update the genome
   * in-place.
   *
   * `payload.actions` contains the primary CPPN actions (Link weights and
   * Activation biases). `payload.auxiliary` carries per-sub-CPPN writebacks
   * for multi-CPPN algorithms like DES-HyperNEAT.
   */
  writeBackWeights: (
    genome: GenomeTypeOf<Ctx>,
    payload: WritebackPayload
  ) => void
}
