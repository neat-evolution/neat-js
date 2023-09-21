import type { Matrix, Vector } from './types.js'

export const normalize = (list: Vector): Vector => {
  let sum = 0

  // Calculate the sum of all elements
  for (const val of list) {
    sum += val
  }

  // Normalize the list in place if the sum is not zero
  if (sum !== 0) {
    for (let i = 0; i < list.length; i++) {
      list[i] /= sum
    }
  }

  return list
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
  let pred = norm ? normalize(prediction) : prediction

  // Bound pred values
  for (let i = 0; i < pred.length; i++) {
    pred[i] = Math.min(ma, Math.max(mi, pred[i] as number))
  }

  // Normalize again
  pred = normalize(pred)

  let sum = 0
  for (let i = 0; i < target.length; i++) {
    sum += (target[i] as number) * Math.log(pred[i] as number)
  }

  return -sum
}
