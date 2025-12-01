import fs from 'node:fs/promises'

import {
  defaultNEATConfigOptions,
  type Activation,
  type Target,
  type InitConfig,
  type Phenotype,
  PhenotypeActionType,
  type PhenotypeAction,
} from '@neat-evolution/core'
import {
  createGenome,
  type CPPNGenomeFactoryOptions,
  createState,
  defaultCPPNGenomeOptions,
  createConfig,
  type CPPNGenome,
  type CPPNGenomeOptions,
  type CPPNNodeData,
} from '@neat-evolution/cppn'
import { createExecutor } from '@neat-evolution/executor'
import {
  toPointKey,
  type Point,
  type PointKey,
} from '@neat-evolution/hyperneat'
import type { NEATLinkData } from '@neat-evolution/neat'

import {
  QuadPoint,
  defaultESHyperNEATGenomeOptions,
  type WeightFn,
} from '../../../src/index.js'

export interface QuadPointJSONData {
  x: number
  y: number
  width: number
  weight: number
  depth: number
  variance: number
  children: QuadPointJSONData[] | null
}

export interface TargetJSONData {
  node: Point
  edge: number
}

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

interface BandValueData {
  x: number
  y: number
  weight: number
  width: number
  left_minus: number
  right_minus: number
  up_minus: number
  down_minus: number
  band_value: number
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

export interface ExtractLeafData {
  leaf: QuadPointJSONData
  x: number
  y: number
  reverse: boolean
  delta_weight: number
  before_connections: TargetJSONData[]
  after_connections: TargetJSONData[]
  band_values: BandValueData[]
  extracted_leaves: QuadPointJSONData[]
  cppn_genome: CPPNGenomeJSONData
  phenotype: PhenotypeJSONData
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

async function readJSONFile(
  filePath: string
): Promise<[filePath: string, data: ExtractLeafData]> {
  const data = await fs.readFile(filePath, 'utf-8')
  return [filePath, JSON.parse(data)]
}

const jsonDir = new URL('.', import.meta.url).pathname

const files = await fs.readdir(jsonDir)

const jsonFiles = files.filter((file) => file.endsWith('.json'))

const rawTestCases = await Promise.all(
  jsonFiles.map((file) =>
    readJSONFile(new URL(`${jsonDir}/${file}`, import.meta.url).pathname)
  )
)

const createQuadPoint = (data: QuadPointJSONData): QuadPoint => {
  const { x, y, width, depth, weight, variance, children } = data

  const quadPoint = new QuadPoint(
    x,
    y,
    width,
    depth,
    weight,
    defaultESHyperNEATGenomeOptions
  )

  quadPoint.variance = variance

  if (children) {
    quadPoint.children = children.map(createQuadPoint)
  }

  return quadPoint
}

const toBandValues = (bandValues: BandValueData[]): BandValue[] => {
  return bandValues.map((bandValue) => {
    const {
      x,
      y,
      weight,
      width,
      left_minus,
      right_minus,
      up_minus,
      down_minus,
      band_value,
    } = bandValue
    return {
      x,
      y,
      weight,
      width,
      leftMinus: left_minus,
      rightMinus: right_minus,
      upMinus: up_minus,
      downMinus: down_minus,
      bandValue: band_value,
    }
  })
}

interface BandValue {
  x: number
  y: number
  weight: number
  width: number
  leftMinus: number
  rightMinus: number
  upMinus: number
  downMinus: number
  bandValue: number
}

export interface TestCase {
  filePath: string
  args: [
    f: WeightFn,
    connections: Array<Target<PointKey, number>>,
    deltaWeight: number,
  ]
  leaf: QuadPoint
  beforeConnections: Array<Target<PointKey, number>>
  afterConnections: Array<Target<PointKey, number>>
  bandValues: BandValue[]
  genome: CPPNGenome<CPPNGenomeOptions>
  phenotype: Phenotype
  x: number
  y: number
  reverse: boolean
  factoryOptions: CPPNGenomeFactoryOptions
  extractedLeaves: QuadPoint[]
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
      leaf,
      x,
      y,
      reverse,
      before_connections,
      after_connections,
      band_values,
      delta_weight,
      extracted_leaves,
      cppn_genome,
      phenotype: phenotype_data,
    } = testCase
    const phenotype: Phenotype = {
      length: phenotype_data.length,
      inputs: phenotype_data.inputs,
      outputs: phenotype_data.outputs,
      actions: createActions(phenotype_data.actions),
    }
    const genome = createCPPNGenome(cppn_genome)
    const factoryOptions = toCPPNFactoryOptions(cppn_genome)
    const cppn = createExecutor(phenotype)

    const f: WeightFn = (x2: number, y2: number): number => {
      const input = reverse ? [x2, y2, x, y] : [x, y, x2, y2]
      return cppn.execute(input)[0] as number
    }
    const root = createQuadPoint(leaf)
    return {
      filePath,
      args: [f, toTargets(before_connections), delta_weight],
      leaf: root,
      beforeConnections: toTargets(before_connections),
      afterConnections: toTargets(after_connections),
      bandValues: toBandValues(band_values),
      genome,
      phenotype,
      x,
      y,
      reverse,
      factoryOptions,
      extractedLeaves: extracted_leaves.map(createQuadPoint),
    }
  }
)
