import type { ConfigFactory } from './config/ConfigFactory.js'
import type { ConfigOptions } from './config/ConfigOptions.js'
import type { CoreConfig } from './config/CoreConfig.js'
import type { CoreGenome } from './CoreGenome.js'
import type { GenomeData } from './genome/GenomeData.js'
import type { GenomeFactory } from './genome/GenomeFactory.js'
import type { GenomeFactoryOptions } from './genome/GenomeFactoryOptions.js'
import type { GenomeOptions } from './genome/GenomeOptions.js'
import type { CoreLink } from './link/CoreLink.js'
import type { LinkFactory } from './link/LinkFactory.js'
import type { LinkFactoryOptions } from './link/LinkFactoryOptions.js'
import type { CoreNode } from './node/CoreNode.js'
import type { NodeFactory } from './node/NodeFactory.js'
import type { NodeFactoryOptions } from './node/NodeFactoryOptions.js'
import type { PhenotypeFactory } from './phenotype/PhenotypeFactory.js'
import type { CoreState } from './state/CoreState.js'
import type { StateData } from './state/StateData.js'
import type { StateFactory } from './state/StateFactory.js'
import type { ExtendedState } from './state/StateProvider.js'

export interface Algorithm<
  // Genome
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  C extends CoreConfig<NCO, LCO>,
  NSD,
  LSD,
  NS extends ExtendedState<NSD>,
  LS extends ExtendedState<LSD>,
  SD extends StateData,
  S extends CoreState<NSD, LSD, NS, LS, SD>,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions,
  GD extends GenomeData<NCO, LCO, SD, HND, LD, GFO, GO>,
  // CoreNode
  NFO extends NodeFactoryOptions,
  N extends CoreNode<NFO, NCO, NSD, NS, N>,
  // CoreLink
  LFO extends LinkFactoryOptions,
  L extends CoreLink<LFO, LCO, LSD, LS, L>,
  // CoreGenome
  G extends CoreGenome<
    NCO,
    LCO,
    C,
    NSD,
    LSD,
    NS,
    LS,
    SD,
    S,
    HND,
    LD,
    GFO,
    GO,
    GD,
    NFO,
    N,
    LFO,
    L,
    G
  >
> {
  name: string
  pathname: string
  defaultOptions: GO
  createConfig: ConfigFactory<NCO, LCO, C>
  createGenome: GenomeFactory<
    NCO,
    LCO,
    C,
    NSD,
    LSD,
    NS,
    LS,
    SD,
    S,
    HND,
    LD,
    GFO,
    GO,
    G
  >
  createLink: LinkFactory<LFO, LCO, LSD, LS, L>
  createNode: NodeFactory<NFO, NCO, NSD, NS, N>
  createPhenotype: PhenotypeFactory<G>
  createState: StateFactory<NSD, LSD, NS, LS, SD, S>
}
