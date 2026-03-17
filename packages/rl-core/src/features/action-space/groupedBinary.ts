export function extractLeadingValues(
  rawOutput: Float64Array,
  count: number,
  label: string
): Float64Array {
  if (rawOutput.length < count) {
    throw new Error(
      `${label} expected ${count} outputs, received ${rawOutput.length}`
    )
  }

  const values = new Float64Array(count)
  for (let i = 0; i < count; i++) {
    values[i] = rawOutput[i] as number
  }
  return values
}

export function extractGroupedBinaryValues(
  rawOutput: Float64Array,
  factorCount: number,
  label: string
): Float64Array {
  return extractLeadingValues(rawOutput, 2 * factorCount, label)
}

export function sampleGroupedBinaryAction(
  probabilities: Float64Array,
  factorCount: number,
  rng: () => number
): Float64Array {
  const action = new Float64Array(factorCount)
  for (let factorIndex = 0; factorIndex < factorCount; factorIndex++) {
    const pOn = probabilities[2 * factorIndex] as number
    action[factorIndex] = rng() < pOn ? 1 : 0
  }
  return action
}

export function selectGroupedBinaryAction(
  qValues: Float64Array,
  factorCount: number,
  epsilon: number,
  rng: () => number
): Float64Array {
  const action = new Float64Array(factorCount)
  for (let factorIndex = 0; factorIndex < factorCount; factorIndex++) {
    if (rng() < epsilon) {
      action[factorIndex] = rng() < 0.5 ? 1 : 0
      continue
    }

    const qOn = qValues[2 * factorIndex] as number
    const qOff = qValues[2 * factorIndex + 1] as number
    action[factorIndex] = qOn >= qOff ? 1 : 0
  }
  return action
}

export function computeGroupedBinaryBootstrapValues(
  qValues: Float64Array,
  factorCount: number
): Float64Array {
  const bootstrapValues = new Float64Array(factorCount)
  for (let factorIndex = 0; factorIndex < factorCount; factorIndex++) {
    const qOn = qValues[2 * factorIndex] as number
    const qOff = qValues[2 * factorIndex + 1] as number
    bootstrapValues[factorIndex] = Math.max(qOn, qOff)
  }
  return bootstrapValues
}

export function computeGroupedBinaryQErrors(
  rawOutputLength: number,
  qValues: Float64Array,
  action: Float64Array
): Float64Array {
  const errors = new Float64Array(rawOutputLength)
  for (let factorIndex = 0; factorIndex < action.length; factorIndex++) {
    const chosenIndex =
      action[factorIndex] === 1 ? 2 * factorIndex : 2 * factorIndex + 1
    errors[chosenIndex] = qValues[chosenIndex] as number
  }
  return errors
}
