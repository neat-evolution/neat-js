import type { Transition } from '@neat-evolution/execution-manager'
import type { TrainableExecutor } from '@neat-evolution/executor'
import { describe, expect, it } from 'vitest'
import type { QLGradientConfig } from '../src/computeQLOutputErrors.js'
import { trainOnSegment } from '../src/trainOnSegment.js'

function makeTransition(
  reward: number,
  qValues: number[],
  chosenActionIndex: number,
  done = false
): Transition {
  return {
    state: new Float64Array([1, 0]),
    rawOutput: new Float64Array(qValues),
    action: oneHot(chosenActionIndex, qValues.length),
    qValues: new Float64Array(qValues),
    chosenActionIndex,
    reward,
    terminated: done,
    truncated: false,
  }
}

function makeMultiDiscreteTransition(
  reward: number,
  qValues: number[],
  action: number[],
  done = false
): Transition {
  return {
    state: new Float64Array([1, 0]),
    rawOutput: new Float64Array(qValues),
    action: new Float64Array(action),
    qValues: new Float64Array(qValues),
    reward,
    terminated: done,
    truncated: false,
  }
}

function oneHot(index: number, length: number): Float64Array {
  const arr = new Float64Array(length)
  arr[index] = 1
  return arr
}

function mockTrainable(): TrainableExecutor & {
  backwardCalls: { errors: Float64Array; lr: number }[]
} {
  const calls: { errors: Float64Array; lr: number }[] = []
  return {
    backwardCalls: calls,
    forward(_inputs: number[] | Float64Array): Float64Array {
      return new Float64Array(0)
    },
    forwardBatch(batch: Array<number[] | Float64Array>) {
      return batch.map((input) => this.forward(input))
    },
    backward(outputErrors: Float64Array, learningRate: number): void {
      calls.push({ errors: Float64Array.from(outputErrors), lr: learningRate })
    },
    getUpdatedActions() {
      return []
    },
  }
}

const defaultConfig: QLGradientConfig = {
  discountFactor: 0.99,
  learningRate: 0.01,
}

describe('trainOnSegment (standard mode)', () => {
  it('does nothing for empty transitions array', () => {
    const trainable = mockTrainable()
    trainOnSegment(trainable, [], defaultConfig, false, 3)
    expect(trainable.backwardCalls.length).toBe(0)
  })

  it('terminal segment: bootstrap value = 0', () => {
    const trainable = mockTrainable()
    // Q-values: [0.5, 0.3, 0.1], chosen action 0, reward 1, done=true
    const transitions = [makeTransition(1, [0.5, 0.3, 0.1], 0, true)]
    trainOnSegment(trainable, transitions, defaultConfig, false, 3)

    expect(trainable.backwardCalls.length).toBe(1)
    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')

    // G = r + gamma * 0 = 1 (terminal, bootstrap = 0)
    // TD error = Q(s,a) - G = 0.5 - 1 = -0.5
    expect(call.errors[0]).toBeCloseTo(-0.5)
    // Other indices should be 0
    expect(call.errors[1]).toBe(0)
    expect(call.errors[2]).toBe(0)
  })

  it('non-terminal segment: bootstrap value = max(qValues)', () => {
    const trainable = mockTrainable()
    // Q-values: [0.5, 0.8, 0.1], chosen action 0, reward 1, done=false
    // max(Q) = 0.8
    const transitions = [makeTransition(1, [0.5, 0.8, 0.1], 0, false)]
    trainOnSegment(trainable, transitions, defaultConfig, false, 3)

    expect(trainable.backwardCalls.length).toBe(1)
    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')

    // G = r + gamma * max(Q) = 1 + 0.99 * 0.8 = 1.792
    // TD error = Q(s,a) - G = 0.5 - 1.792 = -1.292
    expect(call.errors[0]).toBeCloseTo(-1.292)
  })

  it('single-transition terminal: degenerates to single-step TD(0)', () => {
    const trainable = mockTrainable()
    const transitions = [makeTransition(2, [1.5, 0.3], 0, true)]
    trainOnSegment(trainable, transitions, defaultConfig, false, 2)

    expect(trainable.backwardCalls.length).toBe(1)
    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')

    // G = 2 + 0 = 2, TD error = 1.5 - 2 = -0.5
    expect(call.errors[0]).toBeCloseTo(-0.5)
  })

  it('multi-transition segment: n-step returns propagate backward', () => {
    const gamma = 0.99
    const trainable = mockTrainable()
    const transitions = [
      makeTransition(0.1, [0.3, 0.2], 0, false),
      makeTransition(0.2, [0.4, 0.3], 0, false),
      makeTransition(1.0, [0.5, 0.4], 0, true),
    ]
    trainOnSegment(
      trainable,
      transitions,
      { ...defaultConfig, discountFactor: gamma },
      false,
      2
    )

    expect(trainable.backwardCalls.length).toBe(3)

    // Backward: t=2 first, then t=1, then t=0
    // t=2: G = 1.0 + gamma*0 = 1.0, TD = 0.5 - 1.0 = -0.5
    // t=1: G = 0.2 + gamma*1.0 = 1.19, TD = 0.4 - 1.19 = -0.79
    // t=0: G = 0.1 + gamma*1.19 = 1.2781, TD = 0.3 - 1.2781 = -0.9781

    const call0 = trainable.backwardCalls[0]
    const call1 = trainable.backwardCalls[1]
    const call2 = trainable.backwardCalls[2]
    if (!call0 || !call1 || !call2) throw new Error('Expected 3 backward calls')

    // Note: backward loop processes t=2, t=1, t=0 in that order
    expect(call0.errors[0]).toBeCloseTo(-0.5) // t=2
    expect(call1.errors[0]).toBeCloseTo(-0.79) // t=1
    expect(call2.errors[0]).toBeCloseTo(-0.9781) // t=0
  })

  it('backward pass called once per transition', () => {
    const trainable = mockTrainable()
    const transitions = [
      makeTransition(0.1, [0.3, 0.2], 0, false),
      makeTransition(0.2, [0.4, 0.3], 1, false),
      makeTransition(0.3, [0.5, 0.4], 0, false),
      makeTransition(0.4, [0.6, 0.5], 1, false),
      makeTransition(1.0, [0.7, 0.6], 0, true),
    ]
    trainOnSegment(trainable, transitions, defaultConfig, false, 2)
    expect(trainable.backwardCalls.length).toBe(5)
  })

  it('passes correct learning rate to backward', () => {
    const trainable = mockTrainable()
    const config = { ...defaultConfig, learningRate: 0.05 }
    trainOnSegment(
      trainable,
      [makeTransition(1, [0.5, 0.3], 0, true)],
      config,
      false,
      2
    )
    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')
    expect(call.lr).toBe(0.05)
  })

  it('throws if a transition is missing qValues', () => {
    const trainable = mockTrainable()
    const transitions: Transition[] = [
      {
        state: new Float64Array([1]),
        rawOutput: new Float64Array([0.5, 0.3]),
        action: new Float64Array([1, 0]),
        chosenActionIndex: 0,
        reward: 1,
        terminated: true,
        truncated: false,
      },
    ]
    expect(() =>
      trainOnSegment(trainable, transitions, defaultConfig, false, 2)
    ).toThrow('missing qValues')
  })
})

describe('trainOnSegment (multi-discrete mode)', () => {
  it('terminal segment: per-factor bootstrap values = 0', () => {
    const trainable = mockTrainable()
    // 2 binary factors, 4 Q-values: [Q_on_0, Q_off_0, Q_on_1, Q_off_1]
    // action = [1, 0] -> factor 0 on (chosen Q_on_0=0.5), factor 1 off (chosen Q_off_1=0.6)
    const transitions = [
      makeMultiDiscreteTransition(1.0, [0.5, 0.3, 0.4, 0.6], [1, 0], true),
    ]
    trainOnSegment(trainable, transitions, defaultConfig, true, 2)

    expect(trainable.backwardCalls.length).toBe(1)
    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')

    // Factor 0: G = 1.0, chosen Q = 0.5, TD = 0.5 - 1.0 = -0.5
    // error at index 0 (Q_on_0) = -0.5
    expect(call.errors[0]).toBeCloseTo(-0.5)
    expect(call.errors[1]).toBe(0)

    // Factor 1: G = 1.0, chosen Q = 0.6 (Q_off_1), TD = 0.6 - 1.0 = -0.4
    // error at index 3 (Q_off_1) = -0.4
    expect(call.errors[2]).toBe(0)
    expect(call.errors[3]).toBeCloseTo(-0.4)
  })

  it('non-terminal segment: per-factor bootstrap = max(pair)', () => {
    const trainable = mockTrainable()
    // 2 binary factors, action = [1, 0], done=false
    // Q: [0.5, 0.3, 0.4, 0.6]
    // Factor 0 max = max(0.5, 0.3) = 0.5
    // Factor 1 max = max(0.4, 0.6) = 0.6
    const transitions = [
      makeMultiDiscreteTransition(1.0, [0.5, 0.3, 0.4, 0.6], [1, 0], false),
    ]
    trainOnSegment(trainable, transitions, defaultConfig, true, 2)

    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')

    // Factor 0: G = 1.0 + 0.99 * 0.5 = 1.495, chosen Q = 0.5, TD = 0.5 - 1.495 = -0.995
    expect(call.errors[0]).toBeCloseTo(-0.995)
    // Factor 1: G = 1.0 + 0.99 * 0.6 = 1.594, chosen Q = 0.6, TD = 0.6 - 1.594 = -0.994
    expect(call.errors[3]).toBeCloseTo(-0.994)
  })

  it('each factor pair trained independently per transition', () => {
    const trainable = mockTrainable()
    const transitions = [
      makeMultiDiscreteTransition(0.5, [0.2, 0.4, 0.3, 0.1], [0, 1], true),
    ]
    trainOnSegment(trainable, transitions, defaultConfig, true, 2)

    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')

    // Factor 0: action=0 (off), chosen Q = Q_off_0 = 0.4, G = 0.5, TD = 0.4 - 0.5 = -0.1
    // error at index 1 (Q_off_0)
    expect(call.errors[0]).toBe(0)
    expect(call.errors[1]).toBeCloseTo(-0.1)

    // Factor 1: action=1 (on), chosen Q = Q_on_1 = 0.3, G = 0.5, TD = 0.3 - 0.5 = -0.2
    // error at index 2 (Q_on_1)
    expect(call.errors[2]).toBeCloseTo(-0.2)
    expect(call.errors[3]).toBe(0)
  })
})
