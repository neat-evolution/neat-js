import type {
  RolloutBufferConfig,
  RolloutSegment,
  Transition,
} from '@neat-evolution/execution-manager'

/**
 * Ring buffer that accumulates transitions during inference
 * and produces RolloutSegments on trigger events.
 */
export class RolloutBuffer {
  private buffer: Transition[] = []
  private head = 0
  private count = 0
  private readonly capacity: number | 'episode'
  private readonly minLength: number
  private episodeIndex = 0

  constructor(config: RolloutBufferConfig) {
    this.capacity = config.rolloutLength
    this.minLength = config.minRolloutLength ?? 1
  }

  /** Push a transition into the buffer. */
  push(transition: Transition): void {
    if (this.capacity === 'episode') {
      this.buffer.push(transition)
      this.count = this.buffer.length
    } else {
      if (this.buffer.length < this.capacity) {
        this.buffer.push(transition)
      } else {
        this.buffer[this.head] = transition
      }
      this.head = (this.head + 1) % this.capacity
      this.count = Math.min(this.count + 1, this.capacity)
    }
  }

  /** Number of transitions currently in the buffer. */
  get length(): number {
    return this.count
  }

  /**
   * Whether the buffer has enough transitions for capture.
   * Returns false if count < minRolloutLength.
   */
  canCapture(): boolean {
    return this.count >= this.minLength
  }

  /**
   * Capture the current buffer contents as a RolloutSegment and clear the buffer.
   * Returns null if the buffer is empty or below minRolloutLength.
   */
  capture(trigger: RolloutSegment['trigger']): RolloutSegment | null {
    if (this.count === 0 || !this.canCapture()) {
      return null
    }

    let transitions: Transition[]
    if (this.capacity === 'episode') {
      transitions = this.buffer.slice()
    } else {
      transitions = new Array<Transition>(this.count)
      const start = this.count < this.capacity ? 0 : this.head
      for (let i = 0; i < this.count; i++) {
        const idx = (start + i) % this.capacity
        const t = this.buffer[idx]
        if (t === undefined) {
          throw new Error(`Unexpected empty buffer slot at index ${idx}`)
        }
        transitions[i] = t
      }
    }

    const segment: RolloutSegment = {
      transitions,
      trigger,
      episodeIndex: this.episodeIndex,
    }

    this.clear()
    return segment
  }

  /** Reset the buffer for a new episode. */
  reset(episodeIndex: number): void {
    this.episodeIndex = episodeIndex
    this.clear()
  }

  private clear(): void {
    if (this.capacity === 'episode') {
      this.buffer = []
    }
    this.head = 0
    this.count = 0
  }
}
