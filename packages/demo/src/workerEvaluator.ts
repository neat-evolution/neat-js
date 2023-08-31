import os from 'node:os'

import type { Environment } from '@neat-js/environment'
import type { EvaluatorFactory } from '@neat-js/evaluator'
import { WorkerEvaluator } from '@neat-js/worker-evaluator'

import { demo } from './demo.js'

const workerThreadLimit = os.cpus().length - 2

const evaluators = new Set<WorkerEvaluator>()
const createEvaluator: EvaluatorFactory<null> = (environment: Environment) => {
  const evaluator = new WorkerEvaluator(environment, {
    createEnvironmentPathname: '@neat-js/dataset-environment',
    // FIXME: make createExecutorPathname an env variable
    createExecutorPathname: '@neat-js/executor',
    taskCount: 100,
    threadCount: workerThreadLimit,
  })
  evaluators.add(evaluator)
  return evaluator
}

await demo(createEvaluator)
for (const evaluator of evaluators) {
  await evaluator.terminate()
}
