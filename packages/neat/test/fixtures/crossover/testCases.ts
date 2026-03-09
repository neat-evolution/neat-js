import fs from 'node:fs/promises'

import {
  Activation,
  defaultNEATConfigOptions,
  NodeType,
  toLinkKey,
  toNodeKey,
} from '@neat-evolution/core'

import { createConfig, createGenome, createState } from '../../../src/index.js'

async function readJSONFile<T>(filePath: string): Promise<T> {
  const data = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(data) as T
}

const jsonDir = new URL('.', import.meta.url).pathname

const files = await fs.readdir(jsonDir)

const jsonFiles = files.filter((file) => file.endsWith('.json'))

export interface TestCaseLinkData {
  from: string
  to: string
  weight: number
  innovation: number
}
export interface TestCaseGenomeData {
  hidden_nodes: string[]
  links: TestCaseLinkData[]
}

export interface TestCaseData {
  case: string
  fitness1: number
  fitness2: number
  genome1: TestCaseGenomeData
  genome2: TestCaseGenomeData
  result: TestCaseGenomeData
}

const configProvider = createConfig({ neat: defaultNEATConfigOptions })
const state = createState()

// Helper function to format hidden nodes
const formatHiddenNodes = (hiddenNodes: string[]): number[] => {
  return hiddenNodes.map((node) => {
    const id = parseInt(node.substring(1), 10) // Extract the numerical ID from the node string
    return id
  })
}

const parseNodeKey = (str: string): number => {
  const type = str.charAt(0)
  const id = Number(str.substring(1))

  switch (type) {
    case 'H':
      return toNodeKey(NodeType.Hidden, id)
    case 'I':
      return toNodeKey(NodeType.Input, id)
    case 'O':
      return toNodeKey(NodeType.Output, id)
    default:
      throw new Error(`Unknown node type: ${type}`)
  }
}

// Helper function to format links
const formatLinks = (
  links: TestCaseLinkData[]
): Array<[from: number, to: number, weight: number, innovation: number]> => {
  return links.map((link) => {
    const from = parseNodeKey(link.from)
    const to = parseNodeKey(link.to)
    const innovation = link.innovation || toLinkKey(from, to)
    return [from, to, link.weight, innovation]
  })
}

const createTestGenome = (genomeData: TestCaseGenomeData) => {
  const genome = createGenome(
    configProvider,
    state,
    {
      hiddenActivation: Activation.Sigmoid,
      outputActivation: Activation.Sigmoid,
    },
    { inputs: 4, outputs: 3 },
    {
      hiddenNodes: formatHiddenNodes(genomeData.hidden_nodes),
      links: formatLinks(genomeData.links),
    }
  )
  return genome
}

const rawTestCases = await Promise.all(
  jsonFiles.map((file) =>
    readJSONFile<TestCaseData>(
      new URL(`${jsonDir}/${file}`, import.meta.url).pathname
    )
  )
)
const testCases = rawTestCases.map((testCase: TestCaseData) => {
  const { case: name, fitness1, fitness2, genome1, genome2, result } = testCase
  return {
    name,
    fitness1,
    fitness2,
    genome1: createTestGenome(genome1),
    genome2: createTestGenome(genome2),
    result: createTestGenome(result),
  }
})

export { testCases }
