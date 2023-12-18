import type { StandardEnvironment } from '@neat-evolution/environment'
import type {
  AnyAlgorithm,
  StandardEvaluatorFactory,
} from '@neat-evolution/evaluator'
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

const createEvaluator: StandardEvaluatorFactory<any> = (
  algorithm: AnyAlgorithm<any>,
  environment: StandardEnvironment<any>
) => {
  const evaluator = createWorkerEvaluator(algorithm, environment, {
    createEnvironmentPathname: '@neat-evolution/dataset-environment',
    createExecutorPathname: '@neat-evolution/executor',
    taskCount: 100,
    threadCount: workerThreadLimit,
  })
  terminables.add(evaluator as WorkerEvaluator)
  return evaluator
}

await demo(createReproducer, createEvaluator)

for (const terminable of terminables) {
  await terminable.terminate()
}
