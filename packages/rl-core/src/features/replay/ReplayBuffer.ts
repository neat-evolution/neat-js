export interface ReplayBufferConfig {
  capacity: number
}

export class ReplayBuffer<TItem> {
  private readonly items: TItem[] = []
  private readonly capacity: number
  private nextIndex = 0

  constructor(config: ReplayBufferConfig) {
    this.capacity = config.capacity
  }

  get size(): number {
    return this.items.length
  }

  push(item: TItem): void {
    if (this.items.length < this.capacity) {
      this.items.push(item)
      return
    }
    this.items[this.nextIndex] = item
    this.nextIndex = (this.nextIndex + 1) % this.capacity
  }

  sample(sampleSize: number, rng: () => number): TItem[] {
    if (sampleSize <= 0 || this.items.length === 0) {
      return []
    }
    const samples: TItem[] = []
    for (let i = 0; i < sampleSize; i++) {
      const index = Math.floor(rng() * this.items.length)
      const item = this.items[index]
      if (item === undefined) {
        throw new Error(`Missing replay item at index ${index}`)
      }
      samples.push(item)
    }
    return samples
  }
}
