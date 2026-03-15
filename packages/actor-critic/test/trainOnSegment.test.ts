import type { Transition } from '@neat-evolution/environment'
import type { TrainableExecutor } from '@neat-evolution/executor'
import { describe, expect, it } from 'vitest'
import type { TrainOnSegmentConfig } from '../src/trainOnSegment.js'
import { trainOnSegment } from '../src/trainOnSegment.js'

function makeTransition(
  reward: number,
  criticValue: number,
  done = false
): Transition {
  return {
    state: new Float64Array([1, 0]),
    rawOutput: new Float64Array([0.5, 0.3, criticValue]),
    action: new Float64Array([1, 0]),
    actionProbabilities: new Float64Array([0.7, 0.3]),
    criticValue,
    reward,
    done,
  }
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

const defaultConfig: TrainOnSegmentConfig = {
  discountFactor: 0.99,
  entropyCoefficient: 0,
  clipGradients: false,
  gradientClipValue: 1,
  learningRate: 0.01,
}

describe('trainOnSegment', () => {
  it('does nothing for empty transitions array', () => {
    const trainable = mockTrainable()
    trainOnSegment(trainable, [], defaultConfig)
    expect(trainable.backwardCalls.length).toBe(0)
  })

  it('terminal segment: done=true makes terminalValue=0', () => {
    const trainable = mockTrainable()
    const transitions = [makeTransition(1, 0.5, true)]
    trainOnSegment(trainable, transitions, defaultConfig)

    expect(trainable.backwardCalls.length).toBe(1)
    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')
    expect(call.errors[2]).toBeCloseTo(-0.5)
  })

  it('non-terminal segment: terminalValue = lastTransition.criticValue', () => {
    const trainable = mockTrainable()
    const transitions = [makeTransition(1, 0.5, false)]
    trainOnSegment(trainable, transitions, defaultConfig)

    expect(trainable.backwardCalls.length).toBe(1)
    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')
    expect(call.errors[2]).toBeCloseTo(-0.995)
  })

  it('single-transition segment degenerates to TD(0)', () => {
    const trainable = mockTrainable()
    const transitions = [makeTransition(2, 1.5, true)]
    trainOnSegment(trainable, transitions, defaultConfig)

    expect(trainable.backwardCalls.length).toBe(1)
    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')
    expect(call.errors[2]).toBeCloseTo(-0.5)
  })

  it('multi-transition segment: returns propagate backward correctly', () => {
    const gamma = 0.99
    const trainable = mockTrainable()
    const transitions = [
      makeTransition(0.1, 0.3, false),
      makeTransition(0.2, 0.4, false),
      makeTransition(1.0, 0.5, true),
    ]
    trainOnSegment(trainable, transitions, {
      ...defaultConfig,
      discountFactor: gamma,
    })

    expect(trainable.backwardCalls.length).toBe(3)

    const call0 = trainable.backwardCalls[0]
    const call1 = trainable.backwardCalls[1]
    const call2 = trainable.backwardCalls[2]
    if (!call0 || !call1 || !call2) throw new Error('Expected 3 backward calls')

    // Backward loop processes t=2 first, then t=1, then t=0
    expect(call0.errors[2]).toBeCloseTo(-0.5)
    expect(call1.errors[2]).toBeCloseTo(-0.79)
    expect(call2.errors[2]).toBeCloseTo(-0.9781)
  })

  it('backward pass called once per transition', () => {
    const trainable = mockTrainable()
    const transitions = [
      makeTransition(0.1, 0.3, false),
      makeTransition(0.2, 0.4, false),
      makeTransition(0.3, 0.5, false),
      makeTransition(0.4, 0.6, false),
      makeTransition(1.0, 0.7, true),
    ]
    trainOnSegment(trainable, transitions, defaultConfig)
    expect(trainable.backwardCalls.length).toBe(5)
  })

  it('passes correct learning rate to backward', () => {
    const trainable = mockTrainable()
    const config = { ...defaultConfig, learningRate: 0.05 }
    trainOnSegment(trainable, [makeTransition(1, 0.5, true)], config)
    const call = trainable.backwardCalls[0]
    if (call === undefined) throw new Error('Expected backward call')
    expect(call.lr).toBe(0.05)
  })

  it('throws if a transition is missing criticValue', () => {
    const trainable = mockTrainable()
    const transitions: Transition[] = [
      {
        state: new Float64Array([1]),
        rawOutput: new Float64Array([0.5, 0.1]),
        action: new Float64Array([1]),
        actionProbabilities: new Float64Array([1]),
        reward: 1,
        done: true,
      },
    ]
    expect(() => trainOnSegment(trainable, transitions, defaultConfig)).toThrow(
      'missing criticValue'
    )
  })
})
