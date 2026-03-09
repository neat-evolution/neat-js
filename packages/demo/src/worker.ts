import type { Environment } from '@neat-evolution/environment'
import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'
import type { AnyAlgorithm, EvaluatorFactory } from '@neat-evolution/evaluator'
import type { Population, ReproducerFactory } from '@neat-evolution/evolution'
import { createExecutor } from '@neat-evolution/executor'
import {
  createEvaluator as createWorkerEvaluator,
  type WorkerEvaluator,
} from '@neat-evolution/worker-evaluator'
import {
  createReproducerFactory,
  type Terminable,
} from '@neat-evolution/worker-reproducer'
import { hardwareConcurrency } from '@neat-evolution/worker-threads'

import { method as defaultMethod, demo, Methods } from './demo.js'

const workerThreadLimit = hardwareConcurrency - 1

const terminables = new Set<Terminable>()

function parseMethodArg(argv: string[]): Methods {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--method' && argv[i + 1]) {
      const raw = argv[i + 1] as Methods
      if (Object.values(Methods).includes(raw)) return raw
      console.warn(
        `Unsupported method "${raw}", falling back to ${defaultMethod}`
      )
      return defaultMethod
    }
  }
  return defaultMethod
}

const selectedMethod = parseMethodArg(process.argv.slice(2))

const createReproducer: ReproducerFactory<Population> = createReproducerFactory(
  {
    threadCount: workerThreadLimit,
    enableCustomState: selectedMethod === Methods.DES_HyperNEAT,
  },
  terminables
)

const createEvaluator: EvaluatorFactory = (
  algorithm: AnyAlgorithm,
  environment: Environment
) => {
  // Explicitly use IndividualStrategy for demonstration purposes.
  // This overrides any strategy passed in via options, ensuring the demo
  // always uses the IndividualStrategy.
  const strategy = new IndividualStrategy()

  const evaluator = createWorkerEvaluator(algorithm, environment, {
    createEnvironmentPathname: '@neat-evolution/dataset-environment',
    createExecutorPathname: '@neat-evolution/executor',
    taskCount: 100, // should match population
    threadCount: workerThreadLimit,
    strategy, // Pass the explicitly created strategy
    verbose: false,
  })
  terminables.add(evaluator as WorkerEvaluator)
  return evaluator
}
try {
  await demo(createReproducer, createEvaluator, createExecutor, {
    method: selectedMethod,
  })
} catch (e) {
  console.error(e)
}

for (const terminable of terminables) {
  await terminable.terminate()
}
