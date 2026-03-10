export const softmax = (
  values: number[],
  isAlreadyExponentiated = false
): number[] => {
  if (!Array.isArray(values)) {
    throw new Error('Input must be an array')
  }
  if (values.length === 0) {
    return []
  }

  const probabilities = new Array<number>(values.length)
  let sumOfExponents = 0

  for (let i = 0; i < values.length; i++) {
    const exponentiatedValue = isAlreadyExponentiated
      ? (values[i] ?? 0)
      : Math.exp(values[i] ?? 0)
    probabilities[i] = exponentiatedValue
    sumOfExponents += exponentiatedValue
  }

  if (sumOfExponents === 0) {
    probabilities.fill(0)
    return probabilities
  }

  for (let i = 0; i < probabilities.length; i++) {
    probabilities[i] = (probabilities[i] ?? 0) / sumOfExponents
  }

  return probabilities
}
