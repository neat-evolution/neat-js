import { type WorkerOptions as NodeWorkerOptions } from 'node:worker_threads'

export type RequestCredentials = 'include' | 'omit' | 'same-origin'

export type WorkerType = 'classic' | 'module'

export interface WebWorkerOptions {
  credentials?: RequestCredentials
  name?: string
  type?: WorkerType
}

export type WorkerOptions = NodeWorkerOptions & WebWorkerOptions
