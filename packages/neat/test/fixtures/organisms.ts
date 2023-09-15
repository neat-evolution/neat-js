import fs from 'fs/promises'

import { Organism, type OrganismData } from '@neat-js/evolution'

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

export const organismAData: OrganismData<DefaultNEATGenome> =
  await readJSONFile('./organism-a.json')
export const organismBData: OrganismData<DefaultNEATGenome> =
  await readJSONFile('./organism-b.json')
export const organismCData: OrganismData<DefaultNEATGenome> =
  await readJSONFile('./organism-c.json')
export const organismDData: OrganismData<DefaultNEATGenome> =
  await readJSONFile('./organism-d.json')

const sets: Array<
  [a: OrganismData<DefaultNEATGenome>, b: OrganismData<DefaultNEATGenome>]
> = [
  [organismAData, organismBData],
  [organismCData, organismDData],
]

export const createOrganisms = (
  setIndex: number = 0
): [a: Organism<DefaultNEATGenome>, b: Organism<DefaultNEATGenome>] => {
  const organisms: Array<Organism<DefaultNEATGenome>> = []
  const set = sets[setIndex] as [
    a: OrganismData<DefaultNEATGenome>,
    b: OrganismData<DefaultNEATGenome>
  ]
  for (const organismData of set) {
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
