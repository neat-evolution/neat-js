import { Worker } from 'node:worker_threads'

import type { Environment } from '@neat-js/environment'
import type { Evaluator, FitnessData, PhenotypeData } from '@neat-js/evaluator'
import { Sema } from 'async-sema'

import {
  ActionType,
  createAction,
  type Action,
  type EvaluationResultAction,
  type InitPayload,
} from './WorkerAction.js'

export interface WorkerEvaluatorOptions {
  /** path to module that exports createEnvironment */
  createEnvironmentPathname: string
  /** path to module that exports createExecutor */
  createExecutorPathname: string
  /** Population.size */
  taskCount: number
  /** os.cpus() */
  threadCount: number
}

export interface RequestMapValue {
  resolve: (value: FitnessData | PromiseLike<FitnessData>) => void
  reject: (reason?: any) => void
}

export class WorkerEvaluator implements Evaluator {
  public readonly environment: Environment

  public readonly taskCount: number
  public readonly threadCount: number
  public readonly createExecutorPathname: string
  public readonly createEnvironmentPathname: string
  public readonly initPromise: Promise<void>

  private readonly workers: Worker[]
  private readonly semaphore: Sema
  private readonly requestMap = new Map<Worker, RequestMapValue>()

  constructor(environment: Environment, options: WorkerEvaluatorOptions) {
    this.environment = environment

    this.taskCount = options.taskCount
    this.threadCount = options.threadCount
    this.createExecutorPathname = options.createExecutorPathname
    this.createEnvironmentPathname = options.createEnvironmentPathname

    this.semaphore = new Sema(options.threadCount, {
      capacity: options.taskCount,
    })

    this.workers = []
    this.requestMap = new Map()
    this.initPromise = this.initWorkers()
  }

  async initWorkers() {
    const initPromises: Array<Promise<void>> = []

    for (let i = 0; i < this.threadCount; i++) {
      const initPromise = new Promise<void>((resolve, reject) => {
        const worker = new Worker(
          new URL('./workerEvaluatorScript.js', import.meta.url),
          {
            name: `WorkerEvaluator-${i}`,
          }
        )

        const messageListener = (action: Action<unknown>) => {
          switch (action.type) {
            case ActionType.EVALUATION_RESULT: {
              const data = action as EvaluationResultAction
              const { resolve } = this.requestMap.get(worker) ?? {}
              if (resolve == null) {
                throw new Error('no request found')
              }
              resolve(data.payload)
              break
            }
            case ActionType.INIT_SUCCESS: {
              resolve()
              this.workers.push(worker)
              break
            }
            default: {
              const { reject: rejectRequest } =
                this.requestMap.get(worker) ?? {}
              const error = new Error('Unexpected action type')
              if (rejectRequest != null) {
                rejectRequest(error)
              } else {
                reject(error)
              }
              break
            }
          }
        }

        const errorListener = (error: Error) => {
          const { reject: rejectRequest } = this.requestMap.get(worker) ?? {}
          if (rejectRequest != null) {
            rejectRequest(error)
          } else {
            reject(error)
          }
        }

        worker.on('message', messageListener)
        worker.on('error', errorListener)

        const data: InitPayload = {
          createExecutorPathname: this.createExecutorPathname,
          createEnvironmentPathname: this.createEnvironmentPathname,
          environmentData: this.environment.serialize?.() ?? null,
        }

        worker.postMessage(createAction(ActionType.INIT, data))
      })

      initPromises.push(initPromise)
    }
    await Promise.allSettled(initPromises)
  }

  async terminate() {
    const terminatePromises = new Set<Promise<number>>()
    for (const worker of this.workers) {
      worker.unref()
      worker.postMessage(createAction(ActionType.TERMINATE, null))
      terminatePromises.add(worker.terminate())
    }
    for (const p of terminatePromises) {
      await p
    }
  }

  async *evaluate(
    phenotypeData: Iterable<PhenotypeData>
  ): AsyncIterable<FitnessData> {
    await this.initPromise
    const promises: Array<Promise<FitnessData>> = []

    for (const data of phenotypeData) {
      const p = this.processData(data)
      promises.push(p)
    }

    while (promises.length > 0) {
      const p = promises.shift()
      if (p != null) {
        yield await p
      }
    }
  }

  private async processData(data: PhenotypeData): Promise<FitnessData> {
    await this.semaphore.acquire()
    const worker = this.workers.pop()

    if (worker == null) {
      this.semaphore.release()
      throw new Error('No worker available')
    }

    let fitnessData: FitnessData

    try {
      fitnessData = await this.runWorker(worker, data)
    } finally {
      this.semaphore.release()
      this.workers.push(worker)
    }
    return fitnessData
  }

  private async runWorker(
    worker: Worker,
    phenotypeData: PhenotypeData
  ): Promise<FitnessData> {
    return await new Promise((resolve, reject) => {
      const customResolve = (value: FitnessData | PromiseLike<FitnessData>) => {
        this.requestMap.delete(worker)
        resolve(value)
      }
      this.requestMap.set(worker, { resolve: customResolve, reject })

      // Post data to the worker
      worker.postMessage(createAction(ActionType.EVALUATE, phenotypeData))
    })
  }
}
