import type { Matrix, Vector } from './types.js'

export const normalize = (list: Vector): Vector => {
  let sum = 0
  const len = list.length

  // Calculate the sum of all elements
  for (let i = 0; i < len; i++) {
    sum += list[i] as number
  }

  // Normalize the list if the sum is not zero
  if (sum !== 0) {
    const result = new Array(len)
    for (let i = 0; i < len; i++) {
      result[i] = (list[i] as number) / sum
    }
    return result
  }

  return list
}

export const mse = (
  targets: Matrix,
  predictions: Matrix,
  norm: boolean
): number => {
  const len = targets.length
  if (len === 0) {
    return 0
  }
  if (len !== predictions.length) {
    throw new Error('Mismatched lengths between targets and predictions')
  }
  let totalError = 0
  for (let i = 0; i < len; i++) {
    totalError += mseSingle(
      targets[i] as Vector,
      predictions[i] as Vector,
      norm
    )
  }

  return totalError / len
}

export const mseSingle = (
  target: Vector,
  prediction: Vector,
  norm: boolean
): number => {
  const len = target.length
  if (len !== prediction.length) {
    throw new Error('Mismatched lengths between target and prediction vectors.')
  }

  const normalizedPrediction = norm ? normalize(prediction) : prediction

  let error = 0

  for (let i = 0; i < len; i++) {
    const t = target[i] as number
    const p = normalizedPrediction[i] as number
    error += (t - p) ** 2
  }

  return len > 0 ? error / len : 0
}

export const crossentropy = (
  targets: Matrix,
  predictions: Matrix,
  norm: boolean
): number => {
  let sum = 0
  const len = targets.length // Cache the length

  for (let i = 0; i < len; i++) {
    sum += crossentropySingle(
      targets[i] as Vector,
      predictions[i] as Vector,
      norm
    )
  }

  return sum / len
}

const e = 1e-7
const mi = e
const ma = 1.0 - e

export const crossentropySingle = (
  target: Vector,
  prediction: Vector,
  norm: boolean
): number => {
  const len = prediction.length
  if (len === 0) {
    return 0
  }
  const pred = norm ? normalize(prediction) : prediction

  // Bound pred values - need to create a copy if we're bounding
  const boundedPred = new Array(len)
  for (let i = 0; i < len; i++) {
    boundedPred[i] = Math.min(ma, Math.max(mi, pred[i] as number))
  }

  // Normalize again
  const finalPred = normalize(boundedPred)

  let sum = 0
  for (let i = 0; i < target.length; i++) {
    sum += (target[i] as number) * Math.log(finalPred[i] as number)
  }

  return -sum
}
