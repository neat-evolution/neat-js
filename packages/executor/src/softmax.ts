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

  const exponentiatedValues = isAlreadyExponentiated
    ? values
    : values.map((x) => Math.exp(x))

  const sumOfExponents = exponentiatedValues.reduce((sum, val) => sum + val, 0)

  const probabilities = exponentiatedValues.map((exponentiatedValue) => {
    if (sumOfExponents === 0) {
      return 0
    }
    return exponentiatedValue / sumOfExponents
  })

  return probabilities
}
