import { hardwareConcurrency } from '@neat-evolution/worker-threads'

export interface WorkerReproducerOptions {
  /** os.cpus() */
  threadCount: number
  enableCustomState?: boolean
}

export const defaultWorkerReproducerOptions: WorkerReproducerOptions = {
  threadCount: hardwareConcurrency - 1,
  enableCustomState: false,
}
