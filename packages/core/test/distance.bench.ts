import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  createConfig,
  createState,
  defaultNEATGenomeOptions,
  NEATGenome,
} from '@neat-evolution/neat'
import { createRNG } from '@neat-evolution/utils'
import { bench, describe } from 'vitest'

describe('Genome Distance Benchmark', async () => {
  const config = createConfig({ neat: defaultNEATConfigOptions })
  const state = createState()
  const options = defaultNEATGenomeOptions
  const initConfig = { inputs: 100, outputs: 100 }

  const genome1 = new NEATGenome(config, state, options, initConfig)
  const genome2 = new NEATGenome(config, state, options, initConfig)

  const rng = createRNG('bench')
  console.log('Building genomes...')
  for (let i = 0; i < 500; i++) {
    await genome1.mutationAddNode(rng)
    await genome1.mutationAddLink(rng)
    await genome2.mutationAddNode(rng)
    await genome2.mutationAddLink(rng)
  }

  bench(
    'NEATGenome.distance',
    () => {
      genome1.distance(genome2)
    },
    { iterations: 100 }
  )
})
