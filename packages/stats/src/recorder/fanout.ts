import type { StatsRecorder } from './StatsRecorder.js'

export const createFanoutRecorder = (
  children: StatsRecorder[]
): StatsRecorder => {
  return {
    wants(metric: string): boolean {
      return children.some((child) => child.wants(metric))
    },

    record(metric: string, value: unknown): void {
      for (const child of children) {
        if (child.wants(metric)) {
          child.record(metric, value)
        }
      }
    },

    toJSON() {
      const allMetrics = new Set<string>()
      for (const child of children) {
        for (const metric of child.toJSON().wantedMetrics) {
          allMetrics.add(metric)
        }
      }
      return { wantedMetrics: [...allMetrics] }
    },
  }
}
