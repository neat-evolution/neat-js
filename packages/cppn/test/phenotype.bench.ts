import { defaultNEATConfigOptions } from '@neat-evolution/core'
import { createConfig, createState } from '@neat-evolution/neat'
import { bench, describe } from 'vitest'

import { createPhenotype } from '../src/createPhenotype.js'
import { CPPNGenome } from '../src/CPPNGenome.js'
import { defaultCPPNGenomeOptions } from '../src/CPPNGenomeOptions.js'

describe('CPPN createPhenotype Benchmark', async () => {
  const config = createConfig({ neat: defaultNEATConfigOptions })
  const state = createState()
  const options = defaultCPPNGenomeOptions
  const initConfig = { inputs: 16, outputs: 8 }

  const genome = new CPPNGenome(config, state, options, initConfig)

  for (let i = 0; i < 300; i++) {
    await genome.mutationAddNode()
    await genome.mutationAddLink()
  }

  bench(
    'CPPN.createPhenotype',
    () => {
      createPhenotype(genome)
    },
    { iterations: 200 }
  )
})
