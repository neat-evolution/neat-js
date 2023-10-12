import fs from 'fs/promises'

import { Activation, NodeType, defaultNEATConfigOptions } from '@neat-js/core'

import { createConfig, createGenome, createState } from '../../../src/index.js'

async function readJSONFile(filePath: string): Promise<any> {
  const data = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(data)
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
  fitness: number
  genome: TestCaseGenomeData
}

const configProvider = createConfig(defaultNEATConfigOptions, null, null)
const state = createState()

// Helper function to format hidden nodes
const formatHiddenNodes = (hiddenNodes: string[]): number[] => {
  return hiddenNodes.map((node) => {
    const id = parseInt(node.substring(1)) // Extract the numerical ID from the node string
    return id
  })
}

const expandTypeString = (str: string): string => {
  const type = str.charAt(0)
  const id = str.substring(1)
  let expandedType = ''

  switch (type) {
    case 'H':
      expandedType = 'H'
      break
    case 'I':
      expandedType = 'I'
      break
    case 'O':
      expandedType = 'O'
      break
    default:
      throw new Error(`Unknown node type: ${type}`)
  }

  return `${expandedType}[${id}]`
}

// Helper function to format links
const formatLinks = (
  links: TestCaseLinkData[]
): Array<[from: string, to: string, weight: number, innovation: number]> => {
  return links.map((link) => {
    let { from, to, weight, innovation } = link
    from = expandTypeString(from)
    to = expandTypeString(to)
    return [from, to, weight, innovation]
  })
}

const createTestGenome = (genomeData: TestCaseGenomeData) => {
  const genome = createGenome(
    configProvider,
    state,
    { outputActivation: Activation.Sigmoid },
    { inputs: 4, outputs: 3 },
    {
      hiddenNodes: formatHiddenNodes(genomeData.hidden_nodes),
      links: formatLinks(genomeData.links),
    }
  )
  return genome
}

const rawTestCases = await Promise.all(
  jsonFiles.map(
    (file) =>
      readJSONFile(
        new URL(`${jsonDir}/${file}`, import.meta.url).pathname
      ) as Promise<TestCaseData>
  )
)
const testCases = rawTestCases.map((testCase: TestCaseData) => {
  const { case: name, fitness, genome } = testCase
  return {
    name,
    fitness,
    genome: createTestGenome(genome),
  }
})

export { testCases }
