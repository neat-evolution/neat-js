export interface RunSummaryRecord {
  totalIterations: number
  totalMs: number
  bestFitness: number
  bestIteration: number
  stopReason: 'completed' | 'aborted' | 'timeout' | 'early-stop'
}
