import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  createConfig,
  createState,
  defaultNEATGenomeOptions,
  NEATAlgorithm,
  NEATGenome,
} from '@neat-evolution/neat'

async function profileMutation() {
  const config = createConfig({ neat: defaultNEATConfigOptions })
  const state = createState()
  const options = defaultNEATGenomeOptions
  const initConfig = { inputs: 100, outputs: 100 }

  const genome = new NEATGenome(config, state, options, initConfig)

  console.log('Building large genome...')
  for (let i = 0; i < 500; i++) {
    await genome.mutationAddNode()
    await genome.mutationAddLink()
  }

  console.log('Starting profiling of mutationAddLink...')
  for (let i = 0; i < 1000; i++) {
    await genome.mutationAddLink()
  }
  console.log('Done.')
}

profileMutation()
