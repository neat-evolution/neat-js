import { bench, describe } from 'vitest'
import { demo } from '../src/demo.js'

describe('demo benchmark', () => {
  bench(
    'DES-HyperNEAT demo',
    async () => {
      await demo({
        evolutionOptions: {
          iterations: 1,
          secondsLimit: 2,
        },
      })
    },
    {
      iterations: 1,
    }
  )
})
