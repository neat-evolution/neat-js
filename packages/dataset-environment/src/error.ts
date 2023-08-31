type Vector = number[]
type Matrix = Vector[]

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
  const normalizedPrediction = norm ? normalize(prediction) : [...prediction]
  let error = 0
  for (const [i, val] of target.entries()) {
    error += Math.pow(val - (normalizedPrediction[i] ?? 0), 2)
  }

  return error / target.length
}

export const crossentropy = (
  targets: Matrix,
  predictions: Matrix,
  norm: boolean
): number => {
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
    entropy += -val * Math.log(normalizedPrediction[i] ?? 0)
  }

  return entropy
}
