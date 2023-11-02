import type { ReproducerFactoryOptions } from '@neat-js/evolution'

export interface WorkerReproducerOptions extends ReproducerFactoryOptions {
  /** os.cpus() */
  threadCount: number
  enableCustomState: boolean
}
