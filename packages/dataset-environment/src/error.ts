import type { Matrix, Vector } from './types.js'

export const normalize = (list: Vector): Vector => {
  let sum = 0
  for (const val of list) {
    sum += val
  }

  if (sum !== 0) {
    const normalized = []
    for (const val of list) {
      normalized.push(val / sum)
    }
    return normalized
  } else {
    return [...list] // Clone the list
  }
}

export const mse = (
  targets: Matrix,
  predictions: Matrix,
  norm: boolean
): number => {
  if (targets.length === 0) {
    return 0
  }
  if (targets.length !== predictions.length) {
    throw new Error('Mismatched lengths between targets and predictions')
  }
  let totalError = 0
  for (const [i, target] of targets.entries()) {
    totalError += mseSingle(target, predictions[i] as Vector, norm)
  }

  return totalError / targets.length
}

export const mseSingle = (
  target: Vector,
  prediction: Vector,
  norm: boolean
): number => {
  if (target.length !== prediction.length) {
    throw new Error('Mismatched lengths between target and prediction vectors.')
  }

  const normalizedPrediction = norm ? normalize(prediction) : prediction

  let error = 0

  for (const [i, t] of target.entries()) {
    const p = normalizedPrediction[i] as number
    error += Math.pow(t - p, 2)
  }

  return target.length > 0 ? error / target.length : 0
}

export const crossentropy = (
  targets: Matrix,
  predictions: Matrix,
  norm: boolean
): number => {
  if (targets.length === 0) {
    return 0
  }
  if (targets.length !== predictions.length) {
    throw new Error('Mismatched lengths between targets and predictions')
  }
  let totalEntropy = 0
  for (const [i, target] of targets.entries()) {
    totalEntropy += crossentropySingle(target, predictions[i] as Vector, norm)
  }

  return totalEntropy / targets.length
}

export const crossentropySingle = (
  target: Vector,
  prediction: Vector,
  norm: boolean
): number => {
  if (target.length !== prediction.length) {
    throw new Error('Mismatched lengths between target and prediction vectors.')
  }

  const e = 0.0000001
  const mi = e
  const ma = 1.0 - e

  let normalizedPrediction = norm ? normalize(prediction) : [...prediction]

  for (const [i, val] of normalizedPrediction.entries()) {
    normalizedPrediction[i] = Math.min(Math.max(val, mi), ma)
  }

  normalizedPrediction = normalize(normalizedPrediction)

  let entropy = 0
  for (const [i, val] of target.entries()) {
    const pred = normalizedPrediction[i] as number
    entropy += -val * Math.log(pred)
  }

  return entropy
}
