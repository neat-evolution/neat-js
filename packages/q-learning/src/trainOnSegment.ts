import type { TrainableExecutor } from '@neat-evolution/backprop'
import type { Transition } from '@neat-evolution/environment'
import type { QLGradientConfig } from './computeQLOutputErrors.js'
import {
  computeQLOutputErrors,
  computeQLOutputErrorsPerButton,
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
 * Per-button mode: independent error per button pair
 */
export function trainOnSegment(
  trainable: TrainableExecutor,
  transitions: Transition[],
  config: QLGradientConfig,
  perButton: boolean,
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

  const outputCount = perButton ? 2 * actionCount : actionCount

  if (perButton) {
    trainPerButton(trainable, transitions, config, actionCount)
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
  const terminalValue = lastTransition.done ? 0 : maxValue(lastQValues)

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
    trainable.backward(errors, config.learningRate)
  }
}

/**
 * Per-button mode: each button pair is an independent 2-action DQN.
 * Bootstrap value per button = max(Q_on, Q_off) of last transition.
 */
function trainPerButton(
  trainable: TrainableExecutor,
  transitions: Transition[],
  config: QLGradientConfig,
  buttonCount: number
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

  // Per-button bootstrap values: max of each pair
  const terminalValues = new Float64Array(buttonCount)
  if (!lastTransition.done) {
    for (let b = 0; b < buttonCount; b++) {
      const qOn = lastQValues[2 * b] as number
      const qOff = lastQValues[2 * b + 1] as number
      terminalValues[b] = Math.max(qOn, qOff)
    }
  }

  // Per-button n-step returns, computed backward
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

    // Compute per-button TD errors
    const tdErrors = new Float64Array(buttonCount)
    for (let b = 0; b < buttonCount; b++) {
      G[b] = transition.reward + config.discountFactor * (G[b] as number)
      const actionVal = transition.action[b] as number
      const chosenIdx = actionVal === 1 ? 0 : 1
      const chosenQValue = qValues[2 * b + chosenIdx] as number
      tdErrors[b] = chosenQValue - (G[b] as number)
    }

    const errors = computeQLOutputErrorsPerButton(
      transition,
      tdErrors,
      buttonCount
    )
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
