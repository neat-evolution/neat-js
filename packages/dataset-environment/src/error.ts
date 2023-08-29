type Vector = number[]
type Matrix = Vector[]

export const normalize = (list: Vector): Vector => {
  const sum = list.reduce((acc, curr) => acc + curr, 0)

  if (sum !== 0) {
    return list.map((x) => x / sum)
  } else {
    return [...list] // Clone the list
  }
}

export const mse = (
  targets: Matrix,
  predictions: Matrix,
  norm: boolean
): number => {
  const totalError = targets
    .map((targetRow, index) =>
      mseSingle(targetRow, predictions[index] as Vector, norm)
    )
    .reduce((acc, curr) => acc + curr, 0)

  return totalError / targets.length
}

export const mseSingle = (
  target: Vector,
  prediction: Vector,
  norm: boolean
): number => {
  const normalizedPrediction = norm ? normalize(prediction) : [...prediction]

  const error = target
    .map((tVal, tIndex) =>
      Math.pow(tVal - (normalizedPrediction[tIndex] ?? 0), 2)
    )
    .reduce((acc, curr) => acc + curr, 0)

  return error / target.length
}

export const crossentropy = (
  targets: Matrix,
  predictions: Matrix,
  norm: boolean
): number => {
  const totalEntropy = targets
    .map((targetRow, index) =>
      crossentropySingle(targetRow, predictions[index] as Vector, norm)
    )
    .reduce((acc, curr) => acc + curr, 0)

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
  normalizedPrediction = normalizedPrediction.map((x) =>
    Math.min(Math.max(x, mi), ma)
  )

  normalizedPrediction = normalize(normalizedPrediction)

  const entropy = target
    .map((tVal, tIndex) => -tVal * Math.log(normalizedPrediction[tIndex] ?? 0))
    .reduce((acc, curr) => acc + curr, 0)

  return entropy
}
