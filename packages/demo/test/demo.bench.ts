import { createEvaluator } from '@neat-evolution/evaluator'
import { createReproducer } from '@neat-evolution/evolution'
import { createExecutor } from '@neat-evolution/executor'
import { bench, describe } from 'vitest'
import { demo } from '../src/demo.js'

describe('demo benchmark', () => {
  bench(
    'DES-HyperNEAT demo',
    async () => {
      await demo(
        createReproducer as never,
        createEvaluator as never,
        createExecutor,
        {
          evolutionOptions: {
            iterations: 1,
            secondsLimit: 2,
          },
        }
      )
    },
    {
      iterations: 1,
    }
  )
})
