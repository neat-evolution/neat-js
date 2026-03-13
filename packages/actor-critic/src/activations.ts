/** Apply sigmoid activation: 1 / (1 + exp(-x)) */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

/** Apply tanh activation. */
export function tanh(x: number): number {
  return Math.tanh(x)
}

/**
 * Apply softmax activation to an array of values.
 * Uses the max-subtraction trick for numerical stability.
 */
export function softmax(values: Float64Array): Float64Array {
  const result = new Float64Array(values.length)
  let max = -Infinity
  for (let i = 0; i < values.length; i++) {
    const v = values[i] as number
    if (v > max) {
      max = v
    }
  }
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    const exp = Math.exp((values[i] as number) - max)
    result[i] = exp
    sum += exp
  }
  for (let i = 0; i < values.length; i++) {
    result[i] = (result[i] as number) / sum
  }
  return result
}

/** Derivative of sigmoid: σ(x) * (1 - σ(x)). Takes post-activation value. */
export function sigmoidDerivative(a: number): number {
  return a * (1 - a)
}

/** Derivative of tanh: 1 - tanh²(x). Takes post-activation value. */
export function tanhDerivative(a: number): number {
  return 1 - a * a
}

/** Apply activation to raw actor outputs based on the specified type. */
export function applyActorActivation(
  rawOutputs: Float64Array,
  activation: 'sigmoid' | 'softmax' | 'tanh'
): Float64Array {
  if (activation === 'softmax') {
    return softmax(rawOutputs)
  }
  const result = new Float64Array(rawOutputs.length)
  const fn = activation === 'sigmoid' ? sigmoid : tanh
  for (let i = 0; i < rawOutputs.length; i++) {
    result[i] = fn(rawOutputs[i] as number)
  }
  return result
}
