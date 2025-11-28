import { Worker, type WorkerOptions } from '@neat-evolution/worker-threads'
import { Sema } from 'async-sema'

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
  private readonly verbose: boolean

  constructor(options: WorkerPoolOptions) {
    this.threadCount = options.threadCount
    this.taskCount = options.taskCount
    this.workerScriptUrl = options.workerScriptUrl
    this.workerOptions = options.workerOptions
    this.verbose = options.verbose ?? false

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
      if (this.verbose) {
        console.log(`[WorkerPool] Waiting for worker ${i} to be ready...`)
      }
      const readyPromise = new Promise<void>((resolve) => {
        const handler = (event: any) => {
          if (this.verbose) {
            console.log(`[WorkerPool] Worker ${i} sent a message`, event)
          }
          const message = event.data ?? event
          if (message?.type === WORKER_READY) {
            worker.removeEventListener('message', handler)
            if (this.verbose) {
              console.log(`[WorkerPool] Worker ${i} is ready`)
            }
            resolve()
          }
        }
        worker.addEventListener('message', handler)
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
