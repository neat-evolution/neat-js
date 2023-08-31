import { parentPort } from 'node:worker_threads'

import type { Environment } from '@neat-js/environment'
import type { FitnessData } from '@neat-js/evaluator'
import type { Executor, ExecutorFactory } from '@neat-js/executor'

import {
  ActionType,
  type Action,
  type PayloadMap,
  type InitPayload,
  type EvaluatePayload,
  createAction,
} from './WorkerAction.js'

let environment: Environment | null = null
let createExecutor: ExecutorFactory | null = null

async function handleInit({
  createEnvironmentPathname,
  createExecutorPathname,
  environmentData,
}: InitPayload) {
  const environmentModule = await import(createEnvironmentPathname)
  environment = environmentModule.createEnvironment(environmentData)

  const executorModule = await import(createExecutorPathname)
  createExecutor = executorModule.createExecutor

  if (parentPort == null) {
    throw new Error('Worker must be created with a parent port')
  }

  parentPort.postMessage(createAction(ActionType.INIT_SUCCESS, null))
}

async function handleEvaluate(phenotypeData: EvaluatePayload) {
  if (createExecutor == null || environment == null) {
    throw new Error('Worker must be initialized before evaluating')
  }
  const [speciesIndex, organismIndex, phenotype] = phenotypeData
  const executor: Executor = createExecutor(phenotype)

  const fitness = await environment.evaluate(executor)
  const fitnessData: FitnessData = [speciesIndex, organismIndex, fitness]

  if (parentPort == null) {
    throw new Error('Worker must be created with a parent port')
  }
  parentPort.postMessage(
    createAction(ActionType.EVALUATION_RESULT, fitnessData)
  )
}

async function handleTerminate() {
  console.debug('Terminating worker')
}

function handleError(error: Error) {
  console.error('Error in worker:', error)
  if (parentPort !== null) {
    parentPort.emit('error', error)
  }
}

if (parentPort !== null) {
  parentPort.on('message', (action: Action<unknown>) => {
    // FIXME: validate action type and payload
    switch (action.type) {
      case ActionType.INIT:
        handleInit(action.payload as PayloadMap[ActionType.INIT]).catch(
          handleError
        )
        break
      case ActionType.EVALUATE:
        handleEvaluate(action.payload as PayloadMap[ActionType.EVALUATE]).catch(
          handleError
        )
        break
      case ActionType.TERMINATE:
        handleTerminate().catch(handleError)
        break
      default:
        console.error(`Unknown action type: ${action.type}`)
    }
  })
}
