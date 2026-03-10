import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  createConfig,
  createState,
  defaultNEATGenomeOptions,
  NEATGenome,
} from '@neat-evolution/neat'
import { bench, describe } from 'vitest'

const config = createConfig({ neat: defaultNEATConfigOptions })
const state = createState()
const options = defaultNEATGenomeOptions
const initConfig = { inputs: 100, outputs: 100 }

const createPreparedGenome = async (steps: number): Promise<NEATGenome> => {
  const genome = new NEATGenome(config, state, options, initConfig)

  for (let i = 0; i < steps; i++) {
    await genome.mutationAddNode()
    await genome.mutationAddLink()
  }

  return genome
}

const cloneGenomePool = (genome: NEATGenome, size: number): NEATGenome[] => {
  const factoryOptions = genome.toFactoryOptions()
  return Array.from({ length: size }, () => {
    return new NEATGenome(config, state, options, initConfig, factoryOptions)
  })
}

describe('Genome Mutation Benchmark', async () => {
  const sparseGenome = await createPreparedGenome(250)
  const largeGenome = await createPreparedGenome(500)

  const sparsePool = cloneGenomePool(sparseGenome, 128)
  const largePool = cloneGenomePool(largeGenome, 128)

  let sparseIndex = 0
  let largeIndex = 0

  bench(
    'NEATGenome.mutationAddLink (sparse)',
    async () => {
      const genome = sparsePool[sparseIndex % sparsePool.length] as NEATGenome
      sparseIndex++
      await genome.mutationAddLink()
    },
    { iterations: 100 }
  )

  bench(
    'NEATGenome.mutationAddLink (large)',
    async () => {
      const genome = largePool[largeIndex % largePool.length] as NEATGenome
      largeIndex++
      await genome.mutationAddLink()
    },
    { iterations: 100 }
  )

  bench(
    'NEATGenome.mutate (large)',
    async () => {
      const genome = largePool[largeIndex % largePool.length] as NEATGenome
      largeIndex++
      await genome.mutate()
    },
    { iterations: 100 }
  )
})
