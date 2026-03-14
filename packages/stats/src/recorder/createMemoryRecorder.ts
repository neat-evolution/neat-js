import type { StatsRecorder } from './StatsRecorder.js'

export interface MemoryRecorder extends StatsRecorder {
  get<T = unknown>(metric: string): T[]
  clear(): void
}

export const createMemoryRecorder = (
  subscriptions: string[]
): MemoryRecorder => {
  const subscriptionSet = new Set(subscriptions)
  const data = new Map<string, unknown[]>()

  return {
    wants(metric: string): boolean {
      return subscriptionSet.has(metric)
    },

    record(metric: string, value: unknown): void {
      if (!subscriptionSet.has(metric)) return
      let entries = data.get(metric)
      if (entries == null) {
        entries = []
        data.set(metric, entries)
      }
      entries.push(value)
    },

    get<T = unknown>(metric: string): T[] {
      return (data.get(metric) as T[]) ?? []
    },

    clear(): void {
      data.clear()
    },

    toJSON() {
      return { wantedMetrics: [...subscriptionSet] }
    },
  }
}
