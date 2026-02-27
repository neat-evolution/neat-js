import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  createConfig,
  createState,
  defaultNEATGenomeOptions,
  NEATGenome,
} from '@neat-evolution/neat'
import { bench, describe } from 'vitest'

describe('Genome Distance Benchmark', async () => {
  const config = createConfig({ neat: defaultNEATConfigOptions })
  const state = createState()
  const options = defaultNEATGenomeOptions
  const initConfig = { inputs: 100, outputs: 100 }

  const genome1 = new NEATGenome(config, state, options, initConfig)
  const genome2 = new NEATGenome(config, state, options, initConfig)

  console.log('Building genomes...')
  for (let i = 0; i < 500; i++) {
    await genome1.mutationAddNode()
    await genome1.mutationAddLink()
    await genome2.mutationAddNode()
    await genome2.mutationAddLink()
  }

  bench(
    'NEATGenome.distance',
    () => {
      genome1.distance(genome2)
    },
    { iterations: 100 }
  )
})
