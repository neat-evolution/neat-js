export const mse = (predicted: number[], actual: number[]): number => {
  if (predicted.length !== actual.length) {
    throw new Error(
      `Length mismatch: predicted(${predicted.length}) vs actual(${actual.length})`
    )
  }
  if (predicted.length === 0) return 0
  let sum = 0
  for (let i = 0; i < predicted.length; i++) {
    sum += ((predicted[i] ?? 0) - (actual[i] ?? 0)) ** 2
  }
  return sum / predicted.length
}
