import type { Matrix, Vector } from './types.js'

export const normalize = (list: Vector): Vector => {
  const sum = list.reduce((acc, val) => acc + val, 0)

  if (sum !== 0) {
    return list.map((x) => x / sum)
  } else {
    return list
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
  let sum = 0
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    const p = predictions[i]
    if (t === undefined) {
      throw new Error('target is undefined')
    }
    if (p === undefined) {
      throw new Error('prediction is undefined')
    }
    sum += crossentropySingle(t, p, norm)
  }

  return sum / targets.length
}

export const crossentropySingle = (
  target: Vector,
  prediction: Vector,
  norm: boolean
): number => {
  let pred = prediction
  if (norm) {
    pred = normalize(prediction)
  }

  const e = 1e-7
  const mi = e
  const ma = 1.0 - e
  for (let i = 0; i < pred.length; i++) {
    const p = pred[i]
    if (p === undefined) {
      throw new Error('prediction is undefined')
    }
    pred[i] = Math.min(ma, Math.max(mi, p))
  }

  pred = normalize(pred)

  let sum = 0
  for (let i = 0; i < target.length; i++) {
    const t = target[i]
    const p = pred[i]
    if (t === undefined) {
      throw new Error('target is undefined')
    }
    if (p === undefined) {
      throw new Error('prediction is undefined')
    }
    sum += t * Math.log(p)
  }

  return -sum
}
