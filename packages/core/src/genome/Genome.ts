import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type {
  ConfigTypeOf,
  GenomeDataOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  GenomeTypeOf,
  LinkTypeOf,
  NodeTypeOf,
  StateTypeOf,
} from '../contexts/helpers.js'
import type { LinkKey } from '../link/linkRefToKey.js'
import type { NodeKey } from '../node/nodeRefToKey.js'
import type { InitConfig } from './InitConfig.js'

export interface Genome<Ctx extends AlgorithmContext = AlgorithmContext> {
  readonly config: ConfigTypeOf<Ctx>
  readonly state: StateTypeOf<Ctx>
  readonly genomeOptions: GenomeOptionsOf<Ctx>
  readonly initConfig: InitConfig
  readonly inputs: Map<NodeKey, NodeTypeOf<Ctx>>
  readonly hiddenNodes: Map<NodeKey, NodeTypeOf<Ctx>>
  readonly outputs: Map<NodeKey, NodeTypeOf<Ctx>>
  readonly links: Map<LinkKey, LinkTypeOf<Ctx>>

  clone: () => GenomeTypeOf<Ctx>
  crossover: (
    other: GenomeTypeOf<Ctx>,
    fitness: number,
    otherFitness: number
  ) => GenomeTypeOf<Ctx>
  mutate: () => Promise<void>
  distance: (other: GenomeTypeOf<Ctx>) => number
  insertLink: (link: LinkTypeOf<Ctx>, isSafe?: boolean) => void
  toJSON: () => GenomeDataOf<Ctx>
  toFactoryOptions: () => GenomeFactoryOptionsOf<Ctx>
}
