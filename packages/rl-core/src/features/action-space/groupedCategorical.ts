export function resolveGroupedActionFactorSizes(
  actionCount: number,
  actionFactorSizes?: readonly number[]
): number[] {
  if (actionFactorSizes != null && actionFactorSizes.length > 0) {
    return [...actionFactorSizes]
  }
  return Array.from({ length: actionCount }, () => 2)
}

export function groupedActionOutputCount(
  actionCount: number,
  actionFactorSizes?: readonly number[]
): number {
  return resolveGroupedActionFactorSizes(actionCount, actionFactorSizes).reduce(
    (sum, size) => sum + size,
    0
  )
}

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

export function extractGroupedCategoricalValues(
  rawOutput: Float64Array,
  factorSizes: readonly number[],
  label: string
): Float64Array {
  return extractLeadingValues(
    rawOutput,
    factorSizes.reduce((sum, size) => sum + size, 0),
    label
  )
}

export function chosenGroupedCategoricalIndices(
  action: Float64Array,
  factorSizes: readonly number[],
  label: string
): number[] {
  const expectedLength = factorSizes.reduce((sum, size) => sum + size, 0)
  if (action.length !== expectedLength) {
    throw new Error(
      `${label} expected grouped action length ${expectedLength}, received ${action.length}`
    )
  }

  const indices: number[] = []
  let offset = 0
  for (const size of factorSizes) {
    let chosenIndex = -1
    for (let i = 0; i < size; i++) {
      if (action[offset + i] === 1) {
        chosenIndex = offset + i
        break
      }
    }
    if (chosenIndex === -1) {
      throw new Error(`${label} action must choose one index per factor`)
    }
    indices.push(chosenIndex)
    offset += size
  }
  return indices
}

export function sampleGroupedCategoricalAction(
  probabilities: Float64Array,
  factorSizes: readonly number[],
  rng: () => number
): Float64Array {
  const action = new Float64Array(probabilities.length)
  let offset = 0
  for (const size of factorSizes) {
    const threshold = rng()
    let cumulative = 0
    let chosen = size - 1
    for (let i = 0; i < size; i++) {
      cumulative += probabilities[offset + i] as number
      if (threshold < cumulative) {
        chosen = i
        break
      }
    }
    action[offset + chosen] = 1
    offset += size
  }
  return action
}

export function selectGroupedCategoricalAction(
  qValues: Float64Array,
  factorSizes: readonly number[],
  epsilon: number,
  rng: () => number
): Float64Array {
  const action = new Float64Array(qValues.length)
  let offset = 0
  for (const size of factorSizes) {
    let chosen = 0
    if (rng() < epsilon) {
      chosen = Math.floor(rng() * size)
    } else {
      let bestValue = qValues[offset] as number
      for (let i = 1; i < size; i++) {
        const value = qValues[offset + i] as number
        if (value > bestValue) {
          bestValue = value
          chosen = i
        }
      }
    }
    action[offset + chosen] = 1
    offset += size
  }
  return action
}

export function computeGroupedCategoricalBootstrapValues(
  qValues: Float64Array,
  factorSizes: readonly number[]
): Float64Array {
  const bootstrapValues = new Float64Array(factorSizes.length)
  let offset = 0
  for (let factorIndex = 0; factorIndex < factorSizes.length; factorIndex++) {
    const size = factorSizes[factorIndex] as number
    let bestValue = qValues[offset] as number
    for (let i = 1; i < size; i++) {
      const value = qValues[offset + i] as number
      if (value > bestValue) {
        bestValue = value
      }
    }
    bootstrapValues[factorIndex] = bestValue
    offset += size
  }
  return bootstrapValues
}
