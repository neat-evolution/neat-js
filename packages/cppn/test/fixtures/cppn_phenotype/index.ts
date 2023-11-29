import fs from 'node:fs/promises'

import {
  PhenotypeActionType,
  defaultNEATConfigOptions,
} from '@neat-evolution/core'
import type {
  Activation,
  InitConfig,
  NodeKey,
  Phenotype,
  PhenotypeAction,
} from '@neat-evolution/core'
import {
  createConfig,
  createState,
  type NEATLinkData,
} from '@neat-evolution/neat'

import {
  createGenome,
  type CPPNGenome,
  type CPPNGenomeFactoryOptions,
  type CPPNGenomeOptions,
  defaultCPPNGenomeOptions,
  type CPPNNodeData,
} from '../../../src/index.js'

async function readJSONFile(
  filePath: string
): Promise<[filePath: string, data: CPPNPhenotypeData]> {
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

interface ActivationActionJSONData {
  [PhenotypeActionType.Activation]: [
    node: number,
    bias: number,
    activation: Activation,
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

interface CPPNPhenotypeData {
  genome: CPPNGenomeJSONData
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

export const createActions = (actions: ActionJSONData[]): PhenotypeAction[] => {
  return actions.map((action) => {
    if (isActivationAction(action)) {
      const [node, bias, activation] = action[PhenotypeActionType.Activation]
      return [PhenotypeActionType.Activation, node, bias, activation]
    } else {
      const [from, to, weight] = action[PhenotypeActionType.Link]
      return [PhenotypeActionType.Link, from, to, weight]
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
  genome: CPPNGenome<CPPNGenomeOptions>
  factoryOptions: CPPNGenomeFactoryOptions
  phenotype: Phenotype
}

export const testCases: TestCase[] = rawTestCases.map(
  ([filePath, testCase]): TestCase => {
    const { genome, phenotype } = testCase

    return {
      filePath,
      genome: createCPPNGenome(genome),
      factoryOptions: toCPPNFactoryOptions(genome),
      phenotype: {
        length: phenotype.length,
        inputs: phenotype.inputs,
        outputs: phenotype.outputs,
        actions: createActions(phenotype.actions),
      },
    }
  }
)
