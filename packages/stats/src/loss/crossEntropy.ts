export const crossEntropy = (predicted: number[], actual: number[]): number => {
  if (predicted.length !== actual.length) {
    throw new Error(
      `Length mismatch: predicted(${predicted.length}) vs actual(${actual.length})`
    )
  }
  if (predicted.length === 0) return 0

  const epsilon = 1e-15
  let sum = 0
  for (let i = 0; i < predicted.length; i++) {
    const p = Math.max(epsilon, Math.min(1 - epsilon, predicted[i] ?? 0))
    const a = actual[i] ?? 0
    sum += -(a * Math.log(p) + (1 - a) * Math.log(1 - p))
  }
  return sum / predicted.length
}
