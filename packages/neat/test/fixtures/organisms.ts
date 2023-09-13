import fs from 'fs/promises'

import { Organism } from '@neat-js/evolution'

import {
  type DefaultNEATGenome,
  createConfig,
  createGenome,
  createState,
} from '../../src/index.js'

const readJSONFile = async (filePath: string) => {
  const fileContent = await fs.readFile(
    new URL(filePath, import.meta.url).pathname,
    'utf-8'
  )
  return JSON.parse(fileContent)
}

export const organismAData = await readJSONFile('./organismA.json')
export const organismBData = await readJSONFile('./organismB.json')

export const createOrganisms = (): [
  a: Organism<DefaultNEATGenome>,
  b: Organism<DefaultNEATGenome>
] => {
  const organisms: Array<Organism<DefaultNEATGenome>> = []
  for (const organismData of [organismAData, organismBData]) {
    const {
      genome: {
        config: configOptions,
        state: stateData,
        genomeOptions,
        hiddenNodes,
        links,
      },
      organismState,
    } = organismData
    const configProvider = createConfig(configOptions.neat)
    const state = createState(stateData.neat)

    const genome = createGenome(configProvider, state, genomeOptions, {
      hiddenNodes,
      links,
      isSafe: true,
    })
    organisms.push(
      new Organism(genome, organismState.generation, organismState)
    )
  }
  return organisms as [
    a: Organism<DefaultNEATGenome>,
    b: Organism<DefaultNEATGenome>
  ]
}
