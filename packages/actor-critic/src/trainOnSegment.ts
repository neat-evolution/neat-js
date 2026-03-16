import type { Transition } from '@neat-evolution/execution-manager'
import type { TrainableExecutor } from '@neat-evolution/executor'
import {
  type ACGradientConfig,
  computeACGradients,
} from './computeACGradients.js'
import { computeACMultiDiscreteGradients } from './features/multi-discrete/computeACMultiDiscreteGradients.js'

/** Configuration for trainOnSegment, combining gradient config with learning rate. */
export interface TrainOnSegmentConfig extends ACGradientConfig {
  /** Learning rate for backward pass. */
  learningRate: number
}

/**
 * Train on a captured rollout segment using n-step returns.
 *
 * For a segment of length n, computes returns backward:
 *   G_t = r_t + gamma * r_{t+1} + ... + gamma^(n-t-1) * r_{n-1} + gamma^(n-t) * V(s_n)
 *
 * Where V(s_n) = 0 if the segment ends at a terminal state (done=true),
 * otherwise V(s_n) is the critic's value estimate at the last transition.
 *
 * Standard mode: N+1 outputs (N actor + 1 critic)
 * Multi-discrete mode: 2N+1 outputs (N×[P_on, P_off] pairs + 1 critic)
 *
 * Both modes share a single scalar critic V(s). The n-step return G is
 * a single scalar. Only the gradient computation differs per mode.
 */
export function trainOnSegment(
  trainable: TrainableExecutor,
  transitions: Transition[],
  config: TrainOnSegmentConfig,
  multiDiscrete = false,
  factorCount = 0
): void {
  const n = transitions.length
  if (n === 0) {
    return
  }

  const lastTransition = transitions[n - 1]
  if (lastTransition === undefined) {
    throw new Error('Empty transitions array')
  }
  const lastCriticValue = lastTransition.criticValue
  if (lastCriticValue === undefined) {
    throw new Error(
      'Last transition missing criticValue for n-step return bootstrap'
    )
  }
  const terminalValue = lastTransition.done ? 0 : lastCriticValue

  // Compute n-step returns backward (single scalar G, shared critic)
  let G = terminalValue
  for (let t = n - 1; t >= 0; t--) {
    const transition = transitions[t]
    if (transition === undefined) {
      throw new Error(`Missing transition at index ${t}`)
    }
    const criticValue = transition.criticValue
    if (criticValue === undefined) {
      throw new Error(`Transition at index ${t} missing criticValue`)
    }
    G = transition.reward + config.discountFactor * G
    const advantage = G - criticValue

    const errors = multiDiscrete
      ? computeACMultiDiscreteGradients(
          transition,
          advantage,
          config,
          factorCount
        )
      : computeACGradients(transition, advantage, config)

    // Re-establish forward state so backward() uses correct activations
    trainable.forward(transition.state)
    trainable.backward(errors, config.learningRate)
  }
}
