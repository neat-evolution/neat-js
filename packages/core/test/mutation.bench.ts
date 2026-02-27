import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  createConfig,
  createState,
  defaultNEATGenomeOptions,
  NEATGenome,
} from '@neat-evolution/neat'
import { bench, describe } from 'vitest'

describe('Genome Mutation Benchmark (Large Genome)', async () => {
  const config = createConfig({ neat: defaultNEATConfigOptions })
  const state = createState()
  const options = defaultNEATGenomeOptions
  const initConfig = { inputs: 100, outputs: 100 }

  const genome = new NEATGenome(config, state, options, initConfig)

  // Pre-fill with nodes and links to make it large
  console.log('Building large genome...')
  for (let i = 0; i < 500; i++) {
    await genome.mutationAddNode()
    await genome.mutationAddLink()
  }
  console.log('Hidden nodes:', genome.hiddenNodes.size)
  console.log('Links:', genome.links.size)

  bench(
    'NEATGenome.mutationAddLink',
    async () => {
      await genome.mutationAddLink()
    },
    { iterations: 100 }
  )

  bench(
    'NEATGenome.mutate',
    async () => {
      await genome.mutate()
    },
    { iterations: 100 }
  )
})
