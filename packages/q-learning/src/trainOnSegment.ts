import type { Transition } from '@neat-evolution/execution-manager'
import type { TrainableExecutor } from '@neat-evolution/executor'
import type { QLGradientConfig } from './computeQLOutputErrors.js'
import {
  computeQLMultiDiscreteOutputErrors,
  computeQLOutputErrors,
} from './computeQLOutputErrors.js'

/**
 * Train on a captured rollout segment using n-step returns (DQN-style).
 *
 * For Q-learning, the bootstrap value uses max Q:
 *   G_t = r_t + gamma * r_{t+1} + ... + gamma^(n-t) * max_a(Q(s_n, a))
 *
 * Compare to AC which bootstraps with V(s_n).
 * The rollout buffer, trigger logic, and segment capture are identical.
 *
 * Standard mode: error at chosenActionIndex = Q(s, a) - G_t
 * Multi-discrete mode: independent error per factor pair
 */
export function trainOnSegment(
  trainable: TrainableExecutor,
  transitions: Transition[],
  config: QLGradientConfig,
  multiDiscrete: boolean,
  actionCount: number
): void {
  const n = transitions.length
  if (n === 0) {
    return
  }

  const lastTransition = transitions[n - 1]
  if (lastTransition === undefined) {
    throw new Error('Empty transitions array')
  }

  const outputCount = multiDiscrete ? 2 * actionCount : actionCount

  if (multiDiscrete) {
    trainMultiDiscrete(trainable, transitions, config, actionCount)
  } else {
    trainStandard(trainable, transitions, config, outputCount)
  }
}

/**
 * Standard mode: single action space with N discrete actions.
 * Bootstrap value = max(qValues) of last transition.
 */
function trainStandard(
  trainable: TrainableExecutor,
  transitions: Transition[],
  config: QLGradientConfig,
  outputCount: number
): void {
  const n = transitions.length
  const lastTransition = transitions[n - 1]
  if (lastTransition === undefined) {
    throw new Error('Empty transitions array')
  }

  const lastQValues = lastTransition.qValues
  if (lastQValues === undefined) {
    throw new Error(
      'Last transition missing qValues for n-step return bootstrap'
    )
  }

  // Bootstrap with max Q-value (DQN) when not terminal
  const terminalValue = lastTransition.terminated ? 0 : maxValue(lastQValues)

  // Compute n-step returns backward
  let G = terminalValue
  for (let t = n - 1; t >= 0; t--) {
    const transition = transitions[t]
    if (transition === undefined) {
      throw new Error(`Missing transition at index ${t}`)
    }
    const qValues = transition.qValues
    if (qValues === undefined) {
      throw new Error(`Transition at index ${t} missing qValues`)
    }
    const chosenActionIndex = transition.chosenActionIndex
    if (chosenActionIndex === undefined) {
      throw new Error(`Transition at index ${t} missing chosenActionIndex`)
    }

    G = transition.reward + config.discountFactor * G
    const tdError = (qValues[chosenActionIndex] as number) - G
    const errors = computeQLOutputErrors(transition, tdError, outputCount)
    // Re-establish forward state so backward() uses correct activations
    trainable.forward(transition.state)
    trainable.backward(errors, config.learningRate)
  }
}

/**
 * Multi-discrete mode: each factor pair is an independent 2-action DQN.
 * Bootstrap value per factor = max(Q_on, Q_off) of last transition.
 */
function trainMultiDiscrete(
  trainable: TrainableExecutor,
  transitions: Transition[],
  config: QLGradientConfig,
  factorCount: number
): void {
  const n = transitions.length
  const lastTransition = transitions[n - 1]
  if (lastTransition === undefined) {
    throw new Error('Empty transitions array')
  }

  const lastQValues = lastTransition.qValues
  if (lastQValues === undefined) {
    throw new Error(
      'Last transition missing qValues for n-step return bootstrap'
    )
  }

  // Per-factor bootstrap values: max of each pair
  const terminalValues = new Float64Array(factorCount)
  if (!lastTransition.terminated) {
    for (let i = 0; i < factorCount; i++) {
      const qOn = lastQValues[2 * i] as number
      const qOff = lastQValues[2 * i + 1] as number
      terminalValues[i] = Math.max(qOn, qOff)
    }
  }

  // Per-factor n-step returns, computed backward
  const G = Float64Array.from(terminalValues)
  for (let t = n - 1; t >= 0; t--) {
    const transition = transitions[t]
    if (transition === undefined) {
      throw new Error(`Missing transition at index ${t}`)
    }
    const qValues = transition.qValues
    if (qValues === undefined) {
      throw new Error(`Transition at index ${t} missing qValues`)
    }

    // Compute per-factor TD errors
    const tdErrors = new Float64Array(factorCount)
    for (let i = 0; i < factorCount; i++) {
      G[i] = transition.reward + config.discountFactor * (G[i] as number)
      const actionVal = transition.action[i] as number
      const chosenIdx = actionVal === 1 ? 0 : 1
      const chosenQValue = qValues[2 * i + chosenIdx] as number
      tdErrors[i] = chosenQValue - (G[i] as number)
    }

    const errors = computeQLMultiDiscreteOutputErrors(
      transition,
      tdErrors,
      factorCount
    )
    // Re-establish forward state so backward() uses correct activations
    trainable.forward(transition.state)
    trainable.backward(errors, config.learningRate)
  }
}

/** Find the maximum value in a Float64Array. */
function maxValue(values: Float64Array): number {
  let max = -Infinity
  for (let i = 0; i < values.length; i++) {
    const v = values[i] as number
    if (v > max) {
      max = v
    }
  }
  return max
}
