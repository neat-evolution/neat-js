import type { StatsRecorder } from './StatsRecorder.js'

export type StatsHandler = (metric: string, value: unknown) => void

export const createCallbackRecorder = (
  handlers: Record<string, StatsHandler>
): StatsRecorder => {
  return {
    wants(metric: string): boolean {
      return metric in handlers
    },

    record(metric: string, value: unknown): void {
      const handler = handlers[metric]
      if (handler != null) {
        handler(metric, value)
      }
    },

    toJSON() {
      return { wantedMetrics: Object.keys(handlers) }
    },
  }
}
