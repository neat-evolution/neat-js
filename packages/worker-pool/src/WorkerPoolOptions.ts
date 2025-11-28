import type { WorkerOptions } from '@neat-evolution/worker-threads'

export interface WorkerPoolOptions {
  threadCount: number
  taskCount: number
  workerScriptUrl: URL | string
  workerOptions?: WorkerOptions
  verbose?: boolean
}
