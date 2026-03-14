export interface StatsRecorderConfig {
  wantedMetrics: string[]
}

export interface StatsRecorder {
  wants(metric: string): boolean
  record(metric: string, value: unknown): void
  toJSON(): StatsRecorderConfig
}
