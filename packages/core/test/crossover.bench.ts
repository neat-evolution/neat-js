import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  createConfig,
  createState,
  defaultNEATGenomeOptions,
  NEATGenome,
} from '@neat-evolution/neat'
import { bench, describe } from 'vitest'

describe('Genome Crossover Benchmark', async () => {
  const config = createConfig({ neat: defaultNEATConfigOptions })
  const state = createState()
  const options = defaultNEATGenomeOptions
  const initConfig = { inputs: 100, outputs: 100 }

  const parent1 = new NEATGenome(config, state, options, initConfig)
  const parent2 = new NEATGenome(config, state, options, initConfig)

  console.log('Building parent genomes...')
  for (let i = 0; i < 200; i++) {
    await parent1.mutationAddNode()
    await parent1.mutationAddLink()
    await parent2.mutationAddNode()
    await parent2.mutationAddLink()
  }

  bench(
    'NEATGenome.crossover',
    () => {
      parent1.crossover(parent2, 0.8, 0.5)
    },
    { iterations: 100 }
  )
})
