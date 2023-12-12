import { hardwareConcurrency } from '@neat-evolution/worker-threads'

export interface WorkerReproducerOptions {
  /** path to module that exports algorithm; Required on web for vite compatibility */
  algorithmPathname?: string
  /** os.cpus() */
  threadCount: number
  enableCustomState?: boolean
}

export const defaultWorkerReproducerOptions: WorkerReproducerOptions = {
  threadCount: hardwareConcurrency - 1,
  enableCustomState: false,
}
