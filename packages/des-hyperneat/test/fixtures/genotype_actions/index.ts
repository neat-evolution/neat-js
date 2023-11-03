import fs from 'node:fs/promises'

import { defaultNEATConfigOptions, PhenotypeActionType } from '@neat-js/core'
import type {
  Activation,
  Connection,
  InitConfig,
  NodeKey,
  Phenotype,
  PhenotypeAction,
} from '@neat-js/core'
import type { CPPNNodeData } from '@neat-js/cppn'
import type { NEATLinkData } from '@neat-js/neat'

import { createConfig } from '../../../src/createConfig.js'
import { createGenome } from '../../../src/createGenome.js'
import { createState } from '../../../src/createState.js'
import type { DESHyperNEATConfig } from '../../../src/DESHyperNEATConfig.js'
import type { DESHyperNEATGenome } from '../../../src/DESHyperNEATGenome.js'
import type {
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATLinkData,
  DESHyperNEATNodeData,
} from '../../../src/DESHyperNEATGenomeFactoryOptions.js'
import {
  defaultDESHyperNEATGenomeOptions,
  type DESHyperNEATGenomeOptions,
} from '../../../src/DESHyperNEATGenomeOptions.js'
import type { DESHyperNEATState } from '../../../src/DESHyperNEATState.js'
import { topologyInitConfig } from '../../../src/topology/topologyInitConfig.js'

async function readJSONFile(filePath: string): Promise<any> {
  const data = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(data)
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

interface DESHyperNEATNodeJSONData {
  neat: NodeRefJSONData
  cppn: CPPNGenomeJSONData
  depth: number
}

interface DESHyperNEATLinkJSONData {
  neat: LinkJSONData
  cppn: CPPNGenomeJSONData
  depth: number
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

const isActivationAction = (
  action: ActionJSONData
): action is ActivationActionJSONData => {
  return PhenotypeActionType.Activation in action
}

interface ConnectionJSONData {
  node: string
  edge: number | null
}

interface DESHyperNEATGenomeJSONData {
  neat: {
    inputs: Record<string, DESHyperNEATNodeJSONData>
    hidden_nodes: Record<string, DESHyperNEATNodeJSONData>
    outputs: Record<string, DESHyperNEATNodeJSONData>
    links: Record<string, DESHyperNEATLinkJSONData>
    connections: {
      connections: Record<string, ConnectionJSONData[]>
    }
  }
}
interface DESHyperNEATGenomeActionsData {
  genome: DESHyperNEATGenomeJSONData
  phenotype: {
    length: number
    inputs: number[]
    outputs: number[]
    actions: ActionJSONData[]
  }
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

const toDESHyperNEATFactoryOptions = (
  genome: DESHyperNEATGenomeJSONData
): DESHyperNEATGenomeFactoryOptions => {
  const inputs: DESHyperNEATNodeData[] = []
  const hiddenNodes: DESHyperNEATNodeData[] = []
  const outputs: DESHyperNEATNodeData[] = []
  const links: DESHyperNEATLinkData[] = []

  for (const [id, node] of Object.entries(genome.neat.inputs)) {
    inputs.push([
      jsonNodeRefToNodeId(id),
      toCPPNFactoryOptions(node.cppn),
      node.depth,
    ])
  }
  for (const [id, node] of Object.entries(genome.neat.hidden_nodes)) {
    hiddenNodes.push([
      jsonNodeRefToNodeId(id),
      toCPPNFactoryOptions(node.cppn),
      node.depth,
    ])
  }
  for (const [id, node] of Object.entries(genome.neat.outputs)) {
    outputs.push([
      jsonNodeRefToNodeId(id),
      toCPPNFactoryOptions(node.cppn),
      node.depth,
    ])
  }
  for (const link of Object.values(genome.neat.links)) {
    links.push([
      jsonNodeRefToNodeKey(link.neat.from),
      jsonNodeRefToNodeKey(link.neat.to),
      link.neat.weight,
      link.neat.innovation,
      toCPPNFactoryOptions(link.cppn),
      link.depth,
    ])
  }

  return {
    inputs,
    hiddenNodes,
    outputs,
    links,
  }
}

const createDESHyperNEATGenome = (
  genome: DESHyperNEATGenomeJSONData
): DESHyperNEATGenome => {
  const configProvider: DESHyperNEATConfig = createConfig({
    neat: defaultNEATConfigOptions,
    cppn: defaultNEATConfigOptions,
  })
  const stateProvider: DESHyperNEATState = createState()
  const genomeOptions: DESHyperNEATGenomeOptions =
    defaultDESHyperNEATGenomeOptions

  // capture the real initConfig for createPhenotype later
  genomeOptions.initConfig = { inputs: 4, outputs: 3 }

  // choose initConfig based on config options
  const initConfig: InitConfig = topologyInitConfig(
    genomeOptions.initConfig,
    genomeOptions
  )

  const genomeFactoryOptions: DESHyperNEATGenomeFactoryOptions =
    toDESHyperNEATFactoryOptions(genome)

  return createGenome(
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
    genomeFactoryOptions
  )
}

const createActions = (actions: ActionJSONData[]): PhenotypeAction[] => {
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

const createConnections = (
  connections: Record<string, ConnectionJSONData[]>
): Array<Connection<NodeKey, null>> => {
  const result: Array<Connection<NodeKey, null>> = []
  for (const [key, connection] of Object.entries(connections)) {
    for (const { node } of connection) {
      result.push([jsonNodeRefToNodeKey(key), jsonNodeRefToNodeKey(node), null])
    }
  }
  return result
}

const rawTestCases = await Promise.all(
  jsonFiles.map(
    (file) =>
      readJSONFile(
        new URL(`${jsonDir}/${file}`, import.meta.url).pathname
      ) as Promise<DESHyperNEATGenomeActionsData>
  )
)

export interface TestCase {
  genome: DESHyperNEATGenome
  connections: Array<Connection<NodeKey, null>>
  factoryOptions: DESHyperNEATGenomeFactoryOptions
  phenotype: Phenotype
}

const testCases: TestCase[] = rawTestCases.map(
  (testCase: DESHyperNEATGenomeActionsData) => {
    const { genome, phenotype } = testCase
    return {
      genome: createDESHyperNEATGenome(genome),
      connections: createConnections(genome.neat.connections.connections),
      factoryOptions: toDESHyperNEATFactoryOptions(genome),
      phenotype: {
        length: phenotype.length,
        inputs: phenotype.inputs,
        outputs: phenotype.outputs,
        actions: createActions(phenotype.actions),
      },
    }
  }
)

export { testCases }
