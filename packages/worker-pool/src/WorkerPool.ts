import { Worker, type WorkerOptions } from '@neat-evolution/worker-threads'
import { Sema } from 'async-sema'

import { logger } from './logger.js'
import type { WorkerPoolOptions } from './WorkerPoolOptions.js'

export const WORKER_READY = '__WORKER_READY__'

export class WorkerPool {
  public readonly threadCount: number
  public readonly taskCount: number
  private readonly workerScriptUrl: URL | string
  private readonly workerOptions: WorkerOptions | undefined

  private readonly workers: Worker[] = []
  private readonly semaphore: Sema
  private readonly readyPromise: Promise<void>

  constructor(options: WorkerPoolOptions) {
    this.threadCount = options.threadCount
    this.taskCount = options.taskCount
    this.workerScriptUrl = options.workerScriptUrl
    this.workerOptions = options.workerOptions

    this.semaphore = new Sema(this.threadCount, {
      capacity: this.taskCount,
    })

    this.readyPromise = this.initWorkers()
  }

  private async initWorkers(): Promise<void> {
    const readyPromises: Array<Promise<void>> = []

    for (let i = 0; i < this.threadCount; i++) {
      const worker = new Worker(this.workerScriptUrl, this.workerOptions ?? {})
      this.workers.push(worker)

      // Wait for WORKER_READY message from each worker
      logger.debug(`[WorkerPool] Waiting for worker ${i} to be ready...`)
      const readyPromise = new Promise<void>((resolve, reject) => {
        const messageHandler = (event: { data?: unknown }) => {
          logger.debug(`[WorkerPool] Worker ${i} sent a message`, event)
          const message = event.data ?? event
          if (
            message != null &&
            typeof message === 'object' &&
            'type' in message
          ) {
            if (message.type === WORKER_READY) {
              cleanup()
              logger.debug(`[WorkerPool] Worker ${i} is ready`)
              resolve()
            } else if (
              message.type === 'WORKER_ERROR' &&
              'error' in message &&
              message.error === true
            ) {
              cleanup()
              const error = 'payload' in message ? message.payload : undefined
              reject(
                new Error(
                  `Worker ${i} failed during initialization: ${error instanceof Error ? error.message : JSON.stringify(error)}`
                )
              )
            }
          }
        }

        const errorHandler = (event: unknown) => {
          cleanup()
          // Extract error from ErrorEvent if present
          const error =
            event != null && typeof event === 'object' && 'error' in event
              ? (event as { error: unknown }).error
              : event
          reject(
            new Error(
              `Worker ${i} encountered a fatal error during initialization: ${error instanceof Error ? error.message : String(error)}`
            )
          )
        }

        const cleanup = () => {
          worker.removeEventListener('message', messageHandler)
          worker.removeEventListener('error', errorHandler)
        }

        worker.addEventListener('message', messageHandler)
        worker.addEventListener('error', errorHandler)
      })
      readyPromises.push(readyPromise)
    }

    await Promise.all(readyPromises)
  }

  public async ready(): Promise<void> {
    await this.readyPromise
  }

  public async acquire(): Promise<Worker> {
    await this.semaphore.acquire()
    const worker = this.workers.pop()
    if (worker == null) {
      this.semaphore.release()
      throw new Error('No worker available')
    }
    return worker
  }

  public release(worker: Worker): void {
    this.workers.push(worker)
    this.semaphore.release()
  }

  public async terminate(): Promise<void> {
    const terminatePromises = this.workers.map(async (worker) => {
      await worker.terminate()
    })
    await Promise.all(terminatePromises)
  }

  public getWorkers(): Worker[] {
    return [...this.workers]
  }
}
