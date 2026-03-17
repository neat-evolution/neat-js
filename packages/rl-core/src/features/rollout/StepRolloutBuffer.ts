import type { BaseStepTransition } from '../../core/StepTypes.js'

export interface StepRolloutBufferConfig {
  rolloutLength: number | 'episode'
  minRolloutLength?: number
}

export interface StepRolloutSegment<
  TTransition extends BaseStepTransition = BaseStepTransition,
> {
  transitions: TTransition[]
  episodeIndex: number
  completedBy: 'length' | 'episode'
}

export class StepRolloutBuffer<
  TTransition extends BaseStepTransition = BaseStepTransition,
> {
  private readonly transitions: TTransition[] = []
  private readonly minRolloutLength: number
  private readonly rolloutLength: number | 'episode'
  private episodeIndex = 0

  constructor(config: StepRolloutBufferConfig) {
    this.rolloutLength = config.rolloutLength
    this.minRolloutLength = config.minRolloutLength ?? 1
  }

  get length(): number {
    return this.transitions.length
  }

  reset(episodeIndex: number): void {
    this.episodeIndex = episodeIndex
    this.transitions.length = 0
  }

  push(transition: TTransition): StepRolloutSegment<TTransition> | null {
    this.transitions.push(transition)
    if (
      this.rolloutLength !== 'episode' &&
      this.transitions.length >= this.rolloutLength
    ) {
      return this.capture('length')
    }
    return null
  }

  flush(): StepRolloutSegment<TTransition> | null {
    return this.capture('episode')
  }

  private capture(
    completedBy: StepRolloutSegment<TTransition>['completedBy']
  ): StepRolloutSegment<TTransition> | null {
    if (this.transitions.length < this.minRolloutLength) {
      return null
    }
    const segment: StepRolloutSegment<TTransition> = {
      transitions: this.transitions.slice(),
      episodeIndex: this.episodeIndex,
      completedBy,
    }
    this.transitions.length = 0
    return segment
  }
}
