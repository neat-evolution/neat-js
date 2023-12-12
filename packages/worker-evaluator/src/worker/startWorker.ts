import {
  workerContext,
  type WorkerMessageEvent,
} from '@neat-evolution/worker-threads'

import { type ActionMessage } from '../message/ActionMessage.js'
import { ActionType, type PayloadMap } from '../WorkerAction.js'

import { type HandleEvaluateGenomeFn } from './handleEvaluateGenome.js'
import { type HandleInitEvaluatorFn } from './handleInitEvaluator.js'
import { type HandleInitGenomeFn } from './handleInitGenomeFactory.js'
import type { ThreadContext } from './ThreadContext.js'

async function handleTerminate() {
  console.debug('Terminating worker')
}

function handleError(error: Error) {
  console.error('Error in worker:', error)
}

export interface WorkerHandlers<O> {
  handleInitEvaluator: HandleInitEvaluatorFn
  handleInitGenomeFactory: HandleInitGenomeFn
  handleEvaluateGenome: HandleEvaluateGenomeFn<O>
}

export const startWorker = <O>({
  handleInitEvaluator,
  handleInitGenomeFactory,
  handleEvaluateGenome,
}: WorkerHandlers<O>) => {
  const threadContext: ThreadContext = {}

  if (workerContext !== null) {
    workerContext.addEventListener(
      'message',
      (actionEvent: WorkerMessageEvent<ActionMessage<string, any>>) => {
        const action: ActionMessage<string, any> = actionEvent.data
        switch (action.type) {
          case ActionType.INIT_EVALUATOR: {
            handleInitEvaluator(
              action.payload as PayloadMap[ActionType.INIT_EVALUATOR],
              threadContext
            ).catch(handleError)
            break
          }
          case ActionType.INIT_GENOME_FACTORY: {
            handleInitGenomeFactory(
              action.payload as PayloadMap[ActionType.INIT_GENOME_FACTORY],
              threadContext
            ).catch(handleError)
            break
          }
          case ActionType.REQUEST_EVALUATE_GENOME: {
            handleEvaluateGenome(action.payload as O, threadContext).catch(
              handleError
            )
            break
          }
          case ActionType.TERMINATE: {
            handleTerminate().catch(handleError)
            break
          }
          default: {
            console.error(`Unknown action type: ${action.type}`)
          }
        }
      }
    )
  }
}
