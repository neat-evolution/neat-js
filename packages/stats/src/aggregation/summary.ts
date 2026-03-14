import { mean } from './mean.js'
import { median } from './median.js'
import { standardDeviation, variance } from './variance.js'

export interface Summary {
  count: number
  min: number
  max: number
  mean: number
  median: number
  variance: number
  standardDeviation: number
}

export const summary = (values: number[]): Summary => {
  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      variance: 0,
      standardDeviation: 0,
    }
  }

  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: mean(values),
    median: median(values),
    variance: variance(values),
    standardDeviation: standardDeviation(values),
  }
}
