import type {
  Algorithm,
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
} from '@neat-js/core'
import type { Environment } from '@neat-js/environment'
import type {
  Evaluator,
  FitnessData,
  GenomeEntries,
  GenomeEntry,
} from '@neat-js/evaluator'
import { Worker } from '@neat-js/worker-threads'
import { Sema } from 'async-sema'

import type { RequestMapValue } from './RequestMapValue.js'
import {
  ActionType,
  createAction,
  type Action,
  type InitPayload,
} from './WorkerAction.js'
import type { WorkerEvaluatorOptions } from './WorkerEvaluatorOptions.js'

export class WorkerEvaluator implements Evaluator {
  public readonly algorithm: Algorithm<any, any, any, any, any, any, any, any>
  public readonly environment: Environment

  public readonly taskCount: number
  public readonly threadCount: number
  public readonly createExecutorPathname: string
  public readonly createEnvironmentPathname: string
  public readonly initPromise: Promise<void>

  private readonly workers: Worker[]
  private readonly semaphore: Sema
  private readonly requestMap = new Map<Worker, RequestMapValue>()

  constructor(
    algorithm: Algorithm<any, any, any, any, any, any, any, any>,
    environment: Environment,
    options: WorkerEvaluatorOptions
  ) {
    this.algorithm = algorithm
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
            case ActionType.RESPOND_EVALUATE_GENOME: {
              const data = action as Action<number>
              const { resolve } = this.requestMap.get(worker) ?? {}
              if (resolve == null) {
                throw new Error('no request found')
              }
              resolve(data.payload)
              break
            }
            case ActionType.INIT_EVALUATOR_SUCCESS: {
              resolve()
              this.workers.push(worker)
              break
            }
            case ActionType.INIT_GENOME_FACTORY_SUCCESS: {
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

        worker.addEventListener('message', messageListener)
        worker.addEventListener('error', errorListener)

        const data: InitPayload = {
          algorithmPathname: this.algorithm.pathname,
          createExecutorPathname: this.createExecutorPathname,
          createEnvironmentPathname: this.createEnvironmentPathname,
          environmentData: this.environment.serialize?.() ?? null,
        }

        worker.postMessage(createAction(ActionType.INIT_EVALUATOR, data))
      })

      initPromises.push(initPromise)
    }
    await Promise.allSettled(initPromises)
  }

  async initGenomeFactory(
    configData: ConfigData<any, any>,
    genomeOptions: GenomeOptions
  ) {
    await this.initPromise
    for (const worker of this.workers) {
      worker.postMessage(
        createAction(ActionType.INIT_GENOME_FACTORY, {
          configData,
          genomeOptions,
        })
      )
    }
  }

  async terminate() {
    const terminatePromises = new Set<Promise<void>>()
    for (const worker of this.workers) {
      // worker.unref()
      worker.postMessage(createAction(ActionType.TERMINATE, null))
      terminatePromises.add(worker.terminate())
    }
    for (const p of terminatePromises) {
      await p
    }
  }

  async *evaluate(
    genomeEntries: GenomeEntries<any>
  ): AsyncIterable<FitnessData> {
    await this.initPromise
    const promises: Array<Promise<FitnessData>> = []

    for (const entry of genomeEntries) {
      const p = this.evaluateGenomeEntry(entry)
      promises.push(p)
    }

    while (promises.length > 0) {
      const p = promises.shift()
      if (p != null) {
        yield await p
      }
    }
  }

  private async evaluateGenomeEntry(
    genomeEntry: GenomeEntry<any>
  ): Promise<FitnessData> {
    await this.initPromise
    await this.semaphore.acquire()
    const worker = this.workers.pop()

    if (worker == null) {
      this.semaphore.release()
      throw new Error('No worker available')
    }

    let fitnessData: FitnessData

    try {
      const [speciesIndex, organismIndex, genome] = genomeEntry
      const fitness = await this.requestEvaluateGenome(
        worker,
        genome.toFactoryOptions()
      )
      fitnessData = [speciesIndex, organismIndex, fitness]
    } finally {
      this.semaphore.release()
      this.workers.push(worker)
    }
    return fitnessData
  }

  private async requestEvaluateGenome(
    worker: Worker,
    genomeFactoryOptions: GenomeFactoryOptions<any, any, any, any, any, any>
  ): Promise<number> {
    return await new Promise((resolve, reject) => {
      const customResolve = (value: number | PromiseLike<number>) => {
        this.requestMap.delete(worker)
        resolve(value)
      }
      this.requestMap.set(worker, { resolve: customResolve, reject })

      // Post data to the worker
      worker.postMessage(
        createAction(ActionType.REQUEST_EVALUATE_GENOME, genomeFactoryOptions)
      )
    })
  }
}
