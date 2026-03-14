import { mean } from './mean.js'

export const variance = (values: number[]): number => {
  if (values.length === 0) return 0
  const avg = mean(values)
  let sum = 0
  for (const v of values) {
    sum += (v - avg) ** 2
  }
  return sum / values.length
}

export const standardDeviation = (values: number[]): number => {
  return Math.sqrt(variance(values))
}
