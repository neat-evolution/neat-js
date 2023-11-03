import fs from 'node:fs/promises'

import {
  QuadPoint,
  defaultESHyperNEATGenomeOptions,
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

export interface ExpandLeafData {
  leaf: QuadPointJSONData
  delta_weight: number
  expanded_leaves: QuadPointJSONData[]
}

async function readJSONFile(filePath: string): Promise<any> {
  const data = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(data)
}

const jsonDir = new URL('.', import.meta.url).pathname

const files = await fs.readdir(jsonDir)

const jsonFiles = files.filter((file) => file.endsWith('.json'))

const rawTestCases = await Promise.all(
  jsonFiles.map(
    (file) =>
      readJSONFile(
        new URL(`${jsonDir}/${file}`, import.meta.url).pathname
      ) as Promise<ExpandLeafData>
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

export interface TestCase {
  leaf: QuadPoint
  deltaWeight: number
  expandedLeaves: QuadPoint[]
}

export const testCases: TestCase[] = rawTestCases.map(
  (testCase: ExpandLeafData): TestCase => {
    const { leaf, delta_weight, expanded_leaves } = testCase

    return {
      leaf: createQuadPoint(leaf),
      deltaWeight: delta_weight,
      expandedLeaves: expanded_leaves.map(createQuadPoint),
    }
  }
)
