import { hardwareConcurrency } from '@neat-evolution/worker-threads'

export interface WorkerReproducerOptions {
  /** path to module that exports algorithm; Required on web for vite compatibility */
  algorithmPathname?: string
  /** os.cpus() */
  threadCount: number
  enableCustomState?: boolean
  /**
   * URL to the worker script. Required for Vite compatibility.
   * In Vite, import with: import workerUrl from '@neat-evolution/worker-reproducer/workerReproducerScript?worker&url'
   */
  workerScriptUrl?: URL | string
  /** Enable verbose logging */
  verbose?: boolean
}

export const defaultWorkerReproducerOptions: WorkerReproducerOptions = {
  threadCount: hardwareConcurrency - 1,
  enableCustomState: false,
}
