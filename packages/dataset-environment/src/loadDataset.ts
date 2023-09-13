import { promises as fs } from 'node:fs'

import { createRNG, shuffle } from '@neat-js/utils'

import type { Dataset } from './Dataset.js'
import type { DatasetOptions } from './DatasetOptions.js'

export const loadDataset = async (config: DatasetOptions): Promise<Dataset> => {
  try {
    const fileContent = await fs.readFile(config.dataset, 'utf-8')
    const lines = fileContent.split('\n').map((line) => line.trim())

    const isClassification = lines[0] === 'true'
    const oneHotOutput = lines[1] === 'true'

    const inputs: number[][] = []
    const targets: number[][] = []

    let readState = false

    for (let i = 3; i < lines.length; i++) {
      const line = lines[i] as string

      if (line === '') {
        readState = !readState
        continue
      }

      const data = line.split(',').map((val) => parseFloat(val.trim()))

      if (!readState && config.addBiasInput) {
        data.push(1.0)
      }

      if (!readState) {
        inputs.push(data)
      } else {
        targets.push(data)
      }
    }

    if (inputs.length !== targets.length || inputs.length === 0) {
      throw new Error(
        'Data mismatch between inputs and targets or data is empty.'
      )
    }

    shuffle(inputs, createRNG(config.seed))
    shuffle(targets, createRNG(config.seed))

    const totalCount = inputs.length
    const validationCount = Math.round(totalCount * config.validationFraction)
    const testCount = Math.round(totalCount * config.testFraction)
    const trainingCount = totalCount - validationCount - testCount

    const testInputs = inputs.slice(trainingCount + validationCount)
    const testTargets = targets.slice(trainingCount + validationCount)
    const validationInputs = inputs.slice(
      trainingCount,
      trainingCount + validationCount
    )
    const validationTargets = targets.slice(
      trainingCount,
      trainingCount + validationCount
    )
    const trainingInputs = inputs.slice(0, trainingCount)
    const trainingTargets = targets.slice(0, trainingCount)

    return {
      dimensions: {
        inputs: (trainingInputs[0] as number[]).length,
        outputs: (trainingTargets[0] as number[]).length,
      },
      isClassification,
      oneHotOutput,
      trainingInputs,
      trainingTargets,
      validationInputs,
      validationTargets,
      testInputs,
      testTargets,
      totalCount,
      trainingCount,
      validationCount,
      testCount,
    }
  } catch (err) {
    console.error(err)
    throw new Error('Unable to load dataset')
  }
}
