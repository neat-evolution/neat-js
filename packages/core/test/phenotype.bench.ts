import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  createConfig,
  createPhenotype,
  createState,
  defaultNEATGenomeOptions,
  NEATGenome,
} from '@neat-evolution/neat'
import { createRNG } from '@neat-evolution/utils'
import { bench, describe } from 'vitest'

describe('createPhenotype Benchmark', async () => {
  const config = createConfig({ neat: defaultNEATConfigOptions })
  const state = createState()
  const options = defaultNEATGenomeOptions
  const initConfig = { inputs: 100, outputs: 100 }

  const genome = new NEATGenome(config, state, options, initConfig)

  const rng = createRNG('bench')
  console.log('Building large genome...')
  for (let i = 0; i < 500; i++) {
    await genome.mutationAddNode(rng)
    await genome.mutationAddLink(rng)
  }

  bench(
    'NEAT.createPhenotype',
    () => {
      createPhenotype(genome)
    },
    { iterations: 100 }
  )
})
