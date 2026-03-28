import {
  computeGroupedCategoricalBootstrapValues,
  extractGroupedCategoricalValues,
  extractLeadingValues,
  selectGroupedCategoricalAction,
} from './groupedCategorical.js'

export { extractLeadingValues }

export function extractGroupedBinaryValues(
  rawOutput: Float64Array,
  factorCount: number,
  label: string
): Float64Array {
  return extractGroupedCategoricalValues(
    rawOutput,
    Array.from({ length: factorCount }, () => 2),
    label
  )
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
  const categorical = selectGroupedCategoricalAction(
    qValues,
    Array.from({ length: factorCount }, () => 2),
    epsilon,
    rng
  )
  const action = new Float64Array(factorCount)
  for (let factorIndex = 0; factorIndex < factorCount; factorIndex++) {
    action[factorIndex] = categorical[2 * factorIndex] === 1 ? 1 : 0
  }
  return action
}

export function computeGroupedBinaryBootstrapValues(
  qValues: Float64Array,
  factorCount: number
): Float64Array {
  return computeGroupedCategoricalBootstrapValues(
    qValues,
    Array.from({ length: factorCount }, () => 2)
  )
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
