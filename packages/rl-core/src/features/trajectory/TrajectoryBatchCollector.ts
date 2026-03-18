import type { BaseStepTransition } from '../../core/StepTypes.js'

export interface TrajectoryBatchCollectorConfig {
  rolloutLength: number | 'episode'
  batchTransitions: number
  minRolloutLength?: number
}

export interface TrajectoryBatch<
  TTransition extends BaseStepTransition = BaseStepTransition,
> {
  transitions: TTransition[]
  episodeIndices: number[]
  completedBy: 'length' | 'episode' | 'batch'
}

export class TrajectoryBatchCollector<
  TTransition extends BaseStepTransition = BaseStepTransition,
> {
  private readonly currentEpisodeTransitions: TTransition[] = []
  private readonly batchTransitions: TTransition[] = []
  private readonly batchEpisodeIndices: number[] = []
  private readonly minRolloutLength: number
  private readonly rolloutLength: number | 'episode'
  private readonly targetBatchTransitions: number
  private currentEpisodeIndex = 0

  constructor(config: TrajectoryBatchCollectorConfig) {
    this.rolloutLength = config.rolloutLength
    this.targetBatchTransitions = config.batchTransitions
    this.minRolloutLength = config.minRolloutLength ?? 1
  }

  startEpisode(episodeIndex: number): void {
    this.currentEpisodeIndex = episodeIndex
    this.currentEpisodeTransitions.length = 0
  }

  push(transition: TTransition): TrajectoryBatch<TTransition> | null {
    this.currentEpisodeTransitions.push(transition)
    if (
      this.rolloutLength !== 'episode' &&
      this.currentEpisodeTransitions.length >= this.rolloutLength
    ) {
      this.appendCurrentEpisodeChunk()
      return this.captureIfReady('length')
    }
    return null
  }

  endEpisode(): TrajectoryBatch<TTransition> | null {
    this.appendCurrentEpisodeChunk()
    return this.captureIfReady('episode')
  }

  flush(): TrajectoryBatch<TTransition> | null {
    this.appendCurrentEpisodeChunk()
    if (this.batchTransitions.length < this.minRolloutLength) {
      return null
    }
    return this.capture('batch')
  }

  private appendCurrentEpisodeChunk(): void {
    if (this.currentEpisodeTransitions.length < this.minRolloutLength) {
      this.currentEpisodeTransitions.length = 0
      return
    }
    this.batchTransitions.push(...this.currentEpisodeTransitions)
    this.batchEpisodeIndices.push(this.currentEpisodeIndex)
    this.currentEpisodeTransitions.length = 0
  }

  private captureIfReady(
    completedBy: TrajectoryBatch<TTransition>['completedBy']
  ): TrajectoryBatch<TTransition> | null {
    if (this.batchTransitions.length < this.targetBatchTransitions) {
      return null
    }
    return this.capture(completedBy)
  }

  private capture(
    completedBy: TrajectoryBatch<TTransition>['completedBy']
  ): TrajectoryBatch<TTransition> {
    const batch: TrajectoryBatch<TTransition> = {
      transitions: this.batchTransitions.slice(),
      episodeIndices: this.batchEpisodeIndices.slice(),
      completedBy,
    }
    this.batchTransitions.length = 0
    this.batchEpisodeIndices.length = 0
    return batch
  }
}
