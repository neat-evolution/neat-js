import fs from 'node:fs/promises'

import {
  defaultNEATConfigOptions,
  PhenotypeActionType,
  type Activation,
  type InitConfig,
  type Phenotype,
  type PhenotypeAction,
  type Target,
} from '@neat-evolution/core'
import {
  createGenome,
  defaultCPPNGenomeOptions,
  type CPPNGenome,
  type CPPNGenomeFactoryOptions,
  type CPPNGenomeOptions,
  type CPPNNodeData,
} from '@neat-evolution/cppn'
import { createExecutor, type SyncExecutor } from '@neat-evolution/executor'
import {
  toPointKey,
  type Point,
  type PointKey,
} from '@neat-evolution/hyperneat'
import {
  createConfig,
  createState,
  type NEATLinkData,
} from '@neat-evolution/neat'

import {
  defaultESHyperNEATGenomeOptions,
  type ESHyperNEATGenomeOptions,
} from '../../../src/ESHyperNEATGenomeOptions.js'

async function readJSONFile(
  filePath: string
): Promise<[filePath: string, data: FindConnectionsData]> {
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

interface TargetJSONData {
  node: Point
  edge: number
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

interface PhenotypeJSONData {
  length: number
  inputs: number[]
  outputs: number[]
  actions: ActionJSONData[]
}

interface FindConnectionsData {
  x: number
  y: number
  cppn_genome: CPPNGenomeJSONData
  phenotype: PhenotypeJSONData
  reverse: boolean
  result: TargetJSONData[]
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
    links.push([link.from, link.to, link.weight, link.innovation])
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

const toTargets = (
  results: TargetJSONData[]
): Array<Target<PointKey, number>> => {
  return results.map((target) => {
    const node = toPointKey(target.node)
    return { node, edge: target.edge }
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
    x: number,
    y: number,
    cppn: SyncExecutor,
    reverse: boolean,
    options: ESHyperNEATGenomeOptions,
  ]
  genome: CPPNGenome<CPPNGenomeOptions>
  factoryOptions: CPPNGenomeFactoryOptions
  phenotype: Phenotype
  targets: Array<Target<PointKey, number>>
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
      return [PhenotypeActionType.Activation, node, bias, activation]
    } else {
      const [from, to, weight] = action[PhenotypeActionType.Link]
      return [PhenotypeActionType.Link, from, to, weight]
    }
  })
}

export const testCases: TestCase[] = rawTestCases.map(
  ([filePath, testCase]): TestCase => {
    const {
      x,
      y,
      cppn_genome: genomeData,
      phenotype: phenotypeData,
      reverse,
      result,
    } = testCase
    const genome = createCPPNGenome(genomeData)
    const factoryOptions = toCPPNFactoryOptions(genomeData)
    const phenotype: Phenotype = {
      length: phenotypeData.length,
      inputs: phenotypeData.inputs,
      outputs: phenotypeData.outputs,
      actions: createActions(phenotypeData.actions),
    }

    const cppn = createExecutor(phenotype)
    return {
      filePath,
      args: [x, y, cppn, reverse, defaultESHyperNEATGenomeOptions],
      genome,
      factoryOptions,
      phenotype,
      targets: toTargets(result),
    }
  }
)
