import { describe, expect, test } from 'vitest'

import type { TransitionInfo } from '../src/EpisodicContext.js'
import type {
  RolloutBufferConfig,
  RolloutSegment,
  Transition,
} from '../src/Transition.js'

describe('Transition', () => {
  test('accepts base fields', () => {
    const transition: Transition = {
      state: new Float64Array([1.0, 2.0]),
      rawOutput: new Float64Array([0.5, 0.3, 0.2]),
      action: new Float64Array([0.5, 0.3]),
      reward: 1.0,
      done: false,
    }
    expect(transition.reward).toBe(1.0)
    expect(transition.done).toBe(false)
    expect(transition.criticValue).toBeUndefined()
    expect(transition.qValues).toBeUndefined()
  })

  test('accepts AC fields (criticValue, actionProbabilities)', () => {
    const transition: Transition = {
      state: new Float64Array([1.0]),
      rawOutput: new Float64Array([0.8, 0.2, 0.5]),
      action: new Float64Array([0.8, 0.2]),
      reward: 0.5,
      done: false,
      actionProbabilities: new Float64Array([0.7, 0.3]),
      criticValue: 0.85,
    }
    expect(transition.criticValue).toBe(0.85)
    expect(transition.actionProbabilities).toBeInstanceOf(Float64Array)
    expect(Array.from(transition.actionProbabilities as Float64Array)).toEqual([
      0.7, 0.3,
    ])
  })

  test('accepts QL fields (qValues, chosenActionIndex)', () => {
    const transition: Transition = {
      state: new Float64Array([1.0]),
      rawOutput: new Float64Array([0.3, 0.7, 0.1]),
      action: new Float64Array([0, 1, 0]),
      reward: 1.0,
      done: true,
      qValues: new Float64Array([0.3, 0.7, 0.1]),
      chosenActionIndex: 1,
    }
    expect(transition.chosenActionIndex).toBe(1)
    expect(transition.qValues).toBeInstanceOf(Float64Array)
    expect(Array.from(transition.qValues as Float64Array)).toEqual([
      0.3, 0.7, 0.1,
    ])
  })

  test('accepts transition info', () => {
    const info: TransitionInfo = {
      isInteresting: true,
      situationClass: 3,
    }
    const transition: Transition = {
      state: new Float64Array([1.0]),
      rawOutput: new Float64Array([0.5]),
      action: new Float64Array([0.5]),
      reward: 0.0,
      done: false,
      info,
    }
    expect(transition.info?.isInteresting).toBe(true)
    expect(transition.info?.situationClass).toBe(3)
  })
})

describe('RolloutSegment', () => {
  test('contains transitions array and trigger', () => {
    const transitions: Transition[] = [
      {
        state: new Float64Array([1.0]),
        rawOutput: new Float64Array([0.5]),
        action: new Float64Array([0.5]),
        reward: 0.0,
        done: false,
      },
      {
        state: new Float64Array([2.0]),
        rawOutput: new Float64Array([0.8]),
        action: new Float64Array([0.8]),
        reward: 1.0,
        done: true,
      },
    ]

    const segment: RolloutSegment = {
      transitions,
      trigger: 'reward',
      episodeIndex: 0,
    }

    expect(segment.transitions).toHaveLength(2)
    expect(segment.trigger).toBe('reward')
    expect(segment.episodeIndex).toBe(0)
  })

  test('accepts all trigger types', () => {
    const base = {
      transitions: [],
      episodeIndex: 0,
    }

    const triggers: RolloutSegment['trigger'][] = [
      'reward',
      'done',
      'info',
      'prediction-error',
    ]

    for (const trigger of triggers) {
      const segment: RolloutSegment = { ...base, trigger }
      expect(segment.trigger).toBe(trigger)
    }
  })
})

describe('RolloutBufferConfig', () => {
  test('accepts numeric rolloutLength', () => {
    const config: RolloutBufferConfig = {
      rolloutLength: 32,
      rewardThreshold: 0.1,
    }
    expect(config.rolloutLength).toBe(32)
    expect(config.rewardThreshold).toBe(0.1)
    expect(config.minRolloutLength).toBeUndefined()
  })

  test('accepts episode rolloutLength', () => {
    const config: RolloutBufferConfig = {
      rolloutLength: 'episode',
      rewardThreshold: 0.1,
    }
    expect(config.rolloutLength).toBe('episode')
  })

  test('accepts minRolloutLength', () => {
    const config: RolloutBufferConfig = {
      rolloutLength: 32,
      minRolloutLength: 16,
      rewardThreshold: 0.1,
    }
    expect(config.minRolloutLength).toBe(16)
  })
})
