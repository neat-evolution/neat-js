import type { Algorithm } from '@neat-js/core'
import type { Environment } from '@neat-js/environment'
import type { EvaluatorFactory } from '@neat-js/evaluator'
import type { ReproducerFactory } from '@neat-js/evolution'
import {
  createEvaluator as createWorkerEvaluator,
  type WorkerEvaluator,
} from '@neat-js/worker-evaluator'
import {
  createReproducer as createWorkerReproducer,
  type WorkerReproducer,
} from '@neat-js/worker-reproducer'
import { hardwareConcurrency } from '@neat-js/worker-threads'

import { demo } from './demo.js'

const workerThreadLimit = hardwareConcurrency - 1

const evaluators = new Set<WorkerEvaluator>()
const reproducers = new Set<WorkerReproducer<any>>()

const createReproducer: ReproducerFactory<any, any, undefined> = (
  population
) => {
  const reproducer = createWorkerReproducer(population, {
    threadCount: workerThreadLimit,
  })
  reproducers.add(reproducer)
  return reproducer
}

const createEvaluator: EvaluatorFactory<null> = (
  algorithm: Algorithm<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
  environment: Environment
) => {
  const evaluator = createWorkerEvaluator(algorithm, environment, {
    createEnvironmentPathname: '@neat-js/dataset-environment',
    // FIXME: make createExecutorPathname an env variable
    createExecutorPathname: '@neat-js/executor',
    taskCount: 100,
    threadCount: workerThreadLimit,
  })
  evaluators.add(evaluator as WorkerEvaluator)
  return evaluator
}

await demo(createReproducer, createEvaluator)

for (const reproducer of reproducers) {
  await reproducer.terminate()
}
for (const evaluator of evaluators) {
  await evaluator.terminate()
}
