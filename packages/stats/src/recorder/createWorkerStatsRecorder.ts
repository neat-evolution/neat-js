import type { StatsRecorder, StatsRecorderConfig } from './StatsRecorder.js'

/**
 * Creates a StatsRecorder that bridges worker → main thread.
 *
 * `wants()` is answered locally from the serialized config (no round-trip).
 * `record()` fires the send callback only for wanted metrics.
 *
 * @param config - Serialized config from the main-thread recorder's `toJSON()`.
 * @param send - Fire-and-forget callback to deliver the record to main thread.
 */
export const createWorkerStatsRecorder = (
  config: StatsRecorderConfig,
  send: (metric: string, value: unknown) => void
): StatsRecorder => {
  const wantsSet = new Set(config.wantedMetrics)

  return {
    wants(metric: string): boolean {
      return wantsSet.has(metric)
    },

    record(metric: string, value: unknown): void {
      if (wantsSet.has(metric)) {
        send(metric, value)
      }
    },

    toJSON() {
      return { wantedMetrics: [...wantsSet] }
    },
  }
}
