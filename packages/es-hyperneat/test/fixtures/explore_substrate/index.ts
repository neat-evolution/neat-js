import fs from 'node:fs/promises'

import {
  defaultNEATConfigOptions,
  type PhenotypeAction,
  PhenotypeActionType,
  type Activation,
  type Connection,
  type InitConfig,
  type NodeKey,
  type Phenotype,
} from '@neat-evolution/core'
import {
  defaultCPPNGenomeOptions,
  type CPPNNodeData,
  type CPPNGenomeFactoryOptions,
  createGenome,
  type CPPNGenome,
  type CPPNGenomeOptions,
} from '@neat-evolution/cppn'
import { createSyncExecutor, type SyncExecutor } from '@neat-evolution/executor'
import { toPointKey, type Point, type PointKey } from '@neat-evolution/hyperneat'
import { createConfig, createState, type NEATLinkData } from '@neat-evolution/neat'

import {
  defaultESHyperNEATGenomeOptions,
  type ESHyperNEATGenomeOptions,
} from '../../../src/ESHyperNEATGenomeOptions.js'

async function readJSONFile(
  filePath: string
): Promise<[filePath: string, data: ExploreSubstrateData]> {
  const data = await fs.readFile(filePath, 'utf-8')
  return [filePath, JSON.parse(data)]
}

const jsonDir = new URL('.', import.meta.url).pathname

const files = await fs.readdir(jsonDir)

const jsonFiles = files.filter((file) => file.endsWith('.json'))

interface NodeRefJSONData {
  node_ref: string
}

interface CPPNNodeJSONData {
  neat: NodeRefJSONData
  activation: Activation
  bias: number
}

interface LinkJSONData {
  from: string
  to: string
  weight: number
  innovation: number
}

interface CPPNGenomeJSONData {
  neat: {
    inputs: Record<string, CPPNNodeJSONData>
    hidden_nodes: Record<string, CPPNNodeJSONData>
    outputs: Record<string, CPPNNodeJSONData>
    links: Record<string, LinkJSONData>
  }
}

interface ConnectionJSONData {
  from: Point
  to: Point
  edge: number
}

interface ActivationActionJSONData {
  [PhenotypeActionType.Activation]: [
    node: number,
    bias: number,
    activation: Activation
  ]
}

interface LinkActionJSONData {
  [PhenotypeActionType.Link]: [from: number, to: number, weight: number]
}

type ActionJSONData = ActivationActionJSONData | LinkActionJSONData

interface PhenotypeJSONData {
  length: number
  inputs: number[]
  outputs: number[]
  actions: ActionJSONData[]
}

interface ExploreSubstrateData {
  inputs: Point[]
  outputs: Point[]
  cppn_genome: CPPNGenomeJSONData
  phenotype: PhenotypeJSONData
  depth: number
  reverse: boolean
  allow_connections_to_input: boolean
  nodes: Point[][]
  connections: ConnectionJSONData[]
}

const jsonNodeRefToNodeKey = (jsonNodeRef: string): NodeKey => {
  const nodeType = jsonNodeRef.slice(0, 1)
  const nodeId = jsonNodeRef.slice(1)
  return `${nodeType}[${nodeId}]`
}
const jsonNodeRefToNodeId = (jsonNodeRef: string): number => {
  const nodeId = jsonNodeRef.slice(1)
  return Number(nodeId)
}

const toCPPNFactoryOptions = (genome: CPPNGenomeJSONData) => {
  const hiddenNodes: CPPNNodeData[] = []
  const outputs: CPPNNodeData[] = []
  const links: NEATLinkData[] = []
  for (const [id, node] of Object.entries(genome.neat.hidden_nodes)) {
    hiddenNodes.push([jsonNodeRefToNodeId(id), node.bias, node.activation])
  }
  for (const [id, node] of Object.entries(genome.neat.outputs)) {
    outputs.push([jsonNodeRefToNodeId(id), node.bias, node.activation])
  }
  for (const link of Object.values(genome.neat.links)) {
    links.push([
      jsonNodeRefToNodeKey(link.from),
      jsonNodeRefToNodeKey(link.to),
      link.weight,
      link.innovation,
    ])
  }
  return {
    hiddenNodes,
    outputs,
    links,
  }
}

const createCPPNGenome = (
  genome: CPPNGenomeJSONData
): CPPNGenome<CPPNGenomeOptions> => {
  const configProvider = createConfig({
    neat: defaultNEATConfigOptions,
  })
  const stateProvider = createState()
  const genomeOptions = defaultCPPNGenomeOptions

  const initConfig: InitConfig = { inputs: 4, outputs: 2 }

  const genomeFactoryOptions: CPPNGenomeFactoryOptions =
    toCPPNFactoryOptions(genome)

  return createGenome(
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
    genomeFactoryOptions
  )
}

const toConnections = (
  connections: ConnectionJSONData[]
): Array<Connection<PointKey, number>> => {
  return connections.map((connection) => {
    const from = toPointKey(connection.from)
    const to = toPointKey(connection.to)
    return [from, to, connection.edge]
  })
}

const isActivationAction = (
  action: ActionJSONData
): action is ActivationActionJSONData => {
  return PhenotypeActionType.Activation in action
}

export const createActions = (actions: ActionJSONData[]): PhenotypeAction[] => {
  return actions.map((action) => {
    if (isActivationAction(action)) {
      const [node, bias, activation] = action[PhenotypeActionType.Activation]
      return {
        type: PhenotypeActionType.Activation,
        node,
        bias,
        activation,
      }
    } else {
      const [from, to, weight] = action[PhenotypeActionType.Link]
      return {
        type: PhenotypeActionType.Link,
        from,
        to,
        weight,
      }
    }
  })
}

const rawTestCases = await Promise.all(
  jsonFiles.map((file) =>
    readJSONFile(new URL(`${jsonDir}/${file}`, import.meta.url).pathname)
  )
)

export interface TestCase {
  filePath: string
  args: [
    inputs: Point[],
    outputs: Point[],
    cppn: SyncExecutor,
    depth: number,
    reverse: boolean,
    allowConnectionsToInput: boolean,
    options: ESHyperNEATGenomeOptions
  ]
  genome: CPPNGenome<CPPNGenomeOptions>
  factoryOptions: CPPNGenomeFactoryOptions
  phenotype: Phenotype
  nodes: Point[][]
  connections: Array<Connection<PointKey, number>>
}

export const testCases: TestCase[] = rawTestCases.map(
  ([filePath, testCase]): TestCase => {
    const {
      inputs,
      outputs,
      cppn_genome: genomeData,
      phenotype: phenotypeData,
      depth,
      reverse,
      allow_connections_to_input: allowConnectionsToInput,
      nodes,
      connections,
    } = testCase
    const genome = createCPPNGenome(genomeData)
    const factoryOptions = toCPPNFactoryOptions(genomeData)
    const phenotype: Phenotype = {
      length: phenotypeData.length,
      inputs: phenotypeData.inputs,
      outputs: phenotypeData.outputs,
      actions: createActions(phenotypeData.actions),
    }
    const cppn = createSyncExecutor(phenotype)
    return {
      filePath,
      args: [
        inputs,
        outputs,
        cppn,
        depth,
        reverse,
        allowConnectionsToInput,
        defaultESHyperNEATGenomeOptions,
      ],
      genome,
      factoryOptions,
      phenotype,
      nodes,
      connections: toConnections(connections),
    }
  }
)
