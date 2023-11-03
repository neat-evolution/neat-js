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

export interface CalcVarianceData {
  quad_point: QuadPointJSONData
  delta_weight: number
  root: boolean
  branch: boolean
  weights: number[]
  centroid: number
  dw: number
  squares: number[]
  variance: number
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
      ) as Promise<CalcVarianceData>
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
  quadPoint: QuadPoint
  args: [deltaWeight: number, root: boolean, branch: boolean]
  weights: number[]
  centroid: number
  dw: number
  squares: number[]
  variance: number
}

export const testCases: TestCase[] = rawTestCases.map(
  (testCase: CalcVarianceData): TestCase => {
    const {
      quad_point,
      delta_weight,
      root,
      branch,
      weights,
      centroid,
      dw,
      squares,
      variance,
    } = testCase

    return {
      quadPoint: createQuadPoint(quad_point),
      args: [delta_weight, root, branch],
      weights,
      centroid,
      dw,
      squares,
      variance,
    }
  }
)
