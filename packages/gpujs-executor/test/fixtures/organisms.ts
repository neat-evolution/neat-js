import fs from 'fs/promises'

import { Organism, type OrganismData } from '@neat-js/evolution'
import {
  type DefaultNEATGenome,
  createConfig,
  createGenome,
  createState,
} from '@neat-js/neat'

const readJSONFile = async (filePath: string) => {
  const fileContent = await fs.readFile(
    new URL(filePath, import.meta.url).pathname,
    'utf-8'
  )
  return JSON.parse(fileContent)
}

export const organismData: OrganismData<DefaultNEATGenome> = await readJSONFile(
  './organism-a.json'
)

export const createOrganism = (): Organism<DefaultNEATGenome> => {
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
  return new Organism(genome, organismState.generation, organismState)
}
