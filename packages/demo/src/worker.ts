import type { Environment } from '@neat-evolution/environment'
import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'
import type { AnyAlgorithm, EvaluatorFactory } from '@neat-evolution/evaluator'
import type { ReproducerFactory } from '@neat-evolution/evolution'
import {
  createEvaluator as createWorkerEvaluator,
  type WorkerEvaluator,
} from '@neat-evolution/worker-evaluator'
import {
  createReproducerFactory,
  type Terminable,
} from '@neat-evolution/worker-reproducer'
import { hardwareConcurrency } from '@neat-evolution/worker-threads'

import { Methods, demo, method } from './demo.js'

const workerThreadLimit = hardwareConcurrency - 1

const terminables = new Set<Terminable>()

const createReproducer: ReproducerFactory<any, any> = createReproducerFactory(
  {
    threadCount: workerThreadLimit,
    enableCustomState: (method as unknown) === Methods.DES_HyperNEAT,
  },
  terminables
)

const createEvaluator: EvaluatorFactory<any, any> = (
  algorithm: AnyAlgorithm<any>,
  environment: Environment<any>
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
  terminables.add(evaluator as WorkerEvaluator<any>)
  return evaluator
}
try {
  await demo(createReproducer, createEvaluator)
} catch (e) {
  console.error(e)
}

for (const terminable of terminables) {
  await terminable.terminate()
}
