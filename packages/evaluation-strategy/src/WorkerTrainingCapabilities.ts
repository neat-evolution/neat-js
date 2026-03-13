/**
 * Capabilities exposed by WorkerEvaluator so plugins know whether
 * worker threads can handle a given training contract before dispatch.
 */
export interface WorkerTrainingCapabilities {
  rl?: WorkerRLCapabilities
}

export type RLWorkerMethod = 'actor-critic' | 'q-learning'

export interface WorkerRLCapabilities {
  /** True when every worker thread has the RL plugin registered and ready. */
  supported: boolean
  /** Optional diagnostic hint explaining why RL support is unavailable. */
  reason?: string
  methods: Partial<Record<RLWorkerMethod, RLWorkerMethodCapability>>
}

export interface RLWorkerMethodCapability {
  /** Whether the RL method can be evaluated on workers. */
  supported: boolean
  /** Whether worker evaluation can return trained weights for writeback. */
  supportsLamarckianWriteback: boolean
  /** Optional diagnostic hint explaining why the method is disabled. */
  reason?: string
}
