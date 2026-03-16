import { describe, expect, test } from 'vitest'

import type { TransitionInfo } from '../src/features/agent/EpisodicAgentOptions.js'
import type {
  RolloutBufferConfig,
  RolloutSegment,
  Transition,
} from '../src/features/rollout/Transition.js'

describe('Transition', () => {
  test('accepts base fields', () => {
    const transition: Transition = {
      state: new Float64Array([1.0, 2.0]),
      rawOutput: new Float64Array([0.5, 0.3, 0.2]),
      action: new Float64Array([0.5, 0.3]),
      reward: 1.0,
      terminated: false,
      truncated: false,
    }
    expect(transition.reward).toBe(1.0)
    expect(transition.terminated).toBe(false)
    expect(transition.criticValue).toBeUndefined()
    expect(transition.qValues).toBeUndefined()
  })

  test('accepts AC fields (criticValue, actionProbabilities)', () => {
    const transition: Transition = {
      state: new Float64Array([1.0]),
      rawOutput: new Float64Array([0.8, 0.2, 0.5]),
      action: new Float64Array([0.8, 0.2]),
      reward: 0.5,
      terminated: false,
      truncated: false,
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
      terminated: true,
      truncated: false,
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
      eventLabel: 'kill',
      tags: ['combat', 'close-range'],
      isInteresting: true,
      situationClass: 3,
      metadata: { danger: 0.8 },
    }
    const transition: Transition = {
      state: new Float64Array([1.0]),
      rawOutput: new Float64Array([0.5]),
      action: new Float64Array([0.5]),
      reward: 0.0,
      terminated: false,
      truncated: false,
      info,
    }
    expect(transition.info?.isInteresting).toBe(true)
    expect(transition.info?.situationClass).toBe(3)
    expect(transition.info?.eventLabel).toBe('kill')
    expect(transition.info?.tags).toEqual(['combat', 'close-range'])
    expect(transition.info?.metadata).toEqual({ danger: 0.8 })
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
        terminated: false,
        truncated: false,
      },
      {
        state: new Float64Array([2.0]),
        rawOutput: new Float64Array([0.8]),
        action: new Float64Array([0.8]),
        reward: 1.0,
        terminated: true,
        truncated: false,
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

    const triggers: RolloutSegment['trigger'][] = ['reward', 'done', 'info']

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
