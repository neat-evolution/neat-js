import type { ConfigData } from '../config/ConfigData.js'
import type { ConfigFactoryOptions } from '../config/ConfigFactoryOptions.js'
import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { ConfigProvider } from '../config/ConfigProvider.js'
import type { Genome } from '../genome/Genome.js'
import type { GenomeData } from '../genome/GenomeData.js'
import type { GenomeFactoryOptions } from '../genome/GenomeFactoryOptions.js'
import type { GenomeOptions } from '../genome/GenomeOptions.js'
import type { Link } from '../link/Link.js'
import type { LinkFactoryOptions } from '../link/LinkFactoryOptions.js'
import type { Node } from '../node/Node.js'
import type { NodeFactoryOptions } from '../node/NodeFactoryOptions.js'
import type { StateData } from '../state/StateData.js'
import type {
  ExtendedState,
  NEATState,
  StateProvider,
} from '../state/StateProvider.js'
import type { AlgorithmContext } from './AlgorithmContext.js'

export type ConfigFactoryOptionsOf<Ctx extends AlgorithmContext> =
  Ctx['Config']['FactoryOptions'] & ConfigFactoryOptions
export type ConfigNodeOptionsOf<Ctx extends AlgorithmContext> =
  Ctx['Config']['NodeOptions'] & ConfigOptions
export type ConfigLinkOptionsOf<Ctx extends AlgorithmContext> =
  Ctx['Config']['LinkOptions'] & ConfigOptions
export type ConfigDataOf<Ctx extends AlgorithmContext> = Ctx['Config']['Data'] &
  ConfigData
export type ConfigTypeOf<Ctx extends AlgorithmContext> = Ctx['Config']['Type'] &
  ConfigProvider<
    ConfigNodeOptionsOf<Ctx>,
    ConfigLinkOptionsOf<Ctx>,
    ConfigDataOf<Ctx>
  >

export type StateNodeDataOf<Ctx extends AlgorithmContext> =
  Ctx['State']['NodeData']
export type StateLinkDataOf<Ctx extends AlgorithmContext> =
  Ctx['State']['LinkData']
export type StateDataOf<Ctx extends AlgorithmContext> = Ctx['State']['Data'] &
  StateData
export type StateNodeOf<Ctx extends AlgorithmContext> = Ctx['State']['Node'] &
  ExtendedState<StateNodeDataOf<Ctx>>
export type StateLinkOf<Ctx extends AlgorithmContext> = Ctx['State']['Link'] &
  ExtendedState<StateLinkDataOf<Ctx>>
export type StateTypeOf<Ctx extends AlgorithmContext> = Ctx['State']['Type'] &
  NEATState &
  StateProvider<
    StateNodeDataOf<Ctx>,
    StateLinkDataOf<Ctx>,
    StateNodeOf<Ctx>,
    StateLinkOf<Ctx>,
    StateDataOf<Ctx>
  >

export type NodeHiddenDataOf<Ctx extends AlgorithmContext> =
  Ctx['Node']['HiddenData']
export type NodeFactoryOptionsOf<Ctx extends AlgorithmContext> =
  Ctx['Node']['FactoryOptions'] & NodeFactoryOptions
export type NodeTypeOf<Ctx extends AlgorithmContext> = Ctx['Node']['Type'] &
  Node<Ctx>

export type LinkDataOf<Ctx extends AlgorithmContext> = Ctx['Link']['Data']
export type LinkFactoryOptionsOf<Ctx extends AlgorithmContext> =
  Ctx['Link']['FactoryOptions'] & LinkFactoryOptions
export type LinkTypeOf<Ctx extends AlgorithmContext> = Ctx['Link']['Type'] &
  Link<Ctx>

export type GenomeFactoryOptionsOf<Ctx extends AlgorithmContext> =
  Ctx['Genome']['FactoryOptions'] &
    GenomeFactoryOptions<NodeHiddenDataOf<Ctx>, LinkDataOf<Ctx>>
export type GenomeOptionsOf<Ctx extends AlgorithmContext> =
  Ctx['Genome']['Options'] & GenomeOptions
export type GenomeDataOf<Ctx extends AlgorithmContext> = Ctx['Genome']['Data'] &
  GenomeData<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    NodeHiddenDataOf<Ctx>,
    LinkDataOf<Ctx>,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  >
export type GenomeTypeOf<Ctx extends AlgorithmContext> = Ctx['Genome']['Type'] &
  Genome<Ctx>
