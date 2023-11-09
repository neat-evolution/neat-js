import type { ReproducerFactoryOptions } from '@neat-evolution/evolution'

export interface WorkerReproducerOptions extends ReproducerFactoryOptions {
  /** os.cpus() */
  threadCount: number
  enableCustomState?: boolean
}
